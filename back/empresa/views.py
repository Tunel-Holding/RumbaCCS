from .models import UsuarioEvento
from .serializers import UsuarioEventoSerializer
# ViewSet para eventos guardados por usuario
from rest_framework import viewsets, permissions
from .models import (
    Empresa, Evento2, Rating,
    EventoImagen,
    )
from .serializers import (
    EmpresaTokenObtainPairSerializer,
    EmpresaPublicSerializer, 
    RatingSerializer,
    EventoImagenSerializer,
    TempImageSerializer,
    EmpresaBulkSerializer,
    )
from api.models import EmailVerification
from django.utils import timezone
import random
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import status, generics
from .serializers import EmpresaSerializer, EventoSerializer, EmpresaRegistroSerializer, EventoPublicSerializer, EmpresaEventoSerializer
from rest_framework.exceptions import ValidationError
from rest_framework import viewsets
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password
import jwt
import os
import uuid

from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import BasePermission, AllowAny
from .auth_backend import EmpresaOrUsuarioJWTAuthentication
from .permissions import IsEmpresaOrUsuarioAuthenticated, IsUsuarioOrReadOnly
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import RetrieveAPIView, ListAPIView
from .exceptions import * 
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models.expressions import RawSQL
from rest_framework.parsers import MultiPartParser, FormParser
from .supabase_client import supabase, upload_image_to_supabase
from django.conf import settings
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny

class IsEmpresaAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'id') and getattr(request.user, 'is_empresa', False)

class EmpresaPreRegistroView(generics.CreateAPIView):
    serializer_class = EmpresaRegistroSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Retornar los errores completos del serializer
            return Response(serializer.errors, status=400)

        # 🔹 Campos necesarios para empresa
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']  # ✅ mantenido porque empresa debe loguearse
        nombre = serializer.validated_data['nombre']
        phone = serializer.validated_data.get('phone')

        # Generar y guardar pin y datos temporales
        pin = str(random.randint(100000, 999999))
        EmailVerification.objects.update_or_create(
            email=email,
            defaults={
                'code': pin,
                'created_at': timezone.now(),
                'expires_at': timezone.now() + timezone.timedelta(minutes=15),
                'is_verified': False,
            }
        )

        # Enviar el correo con el pin usando Django
        send_mail(
            'Tu código de validación para empresa',
            f'Tu código de validación para empresa es: {pin}',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )

        return Response({"detail": "Se ha enviado un pin de verificación al correo."}, status=201)


# --- Validar pin y crear empresa ---
class EmpresaValidarPinView(generics.CreateAPIView):
    serializer_class = EmpresaSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        password = request.data.get('password')
        email = request.data.get('email')
        pin = request.data.get('pin')
        empresa_data = request.data.get('empresa', {})
        empresa_fields = [
            'nombre', 'rif', 'descripcion', 'lugar', 'telefono', 'email_contacto', 'redes_sociales', 'logo',
        ]
        empresa_data = {k: v for k, v in empresa_data.items() if k in empresa_fields}
        empresa_data['email'] = email

        print(f"[VALIDAR PIN] email={email}, pin={pin}, empresa_data={empresa_data}")

        # Validar pin
        try:
            verif = EmailVerification.objects.get(email=email, code=pin, is_verified=False)
        except EmailVerification.DoesNotExist:
            print(f"[VALIDAR PIN] No se encontró registro para email={email}, pin={pin}, is_verified=False")
            return Response({"detail": "Pin inválido o expirado."}, status=400)

        if verif.expires_at < timezone.now():
            print(f"[VALIDAR PIN] Pin expirado para email={email}, pin={pin}")
            return Response({"detail": "Pin expirado."}, status=400)

        # Marcar como verificado
        verif.is_verified = True
        verif.save()

        empresa_data.pop('password', None)
        empresa = Empresa.objects.create(
            password=make_password(password),
            **empresa_data
        )

        print(f"[VALIDAR PIN] Empresa creada correctamente para email={email}")

        empresa_data_serialized = EmpresaSerializer(
            empresa,
            context={"request": request}
        ).data
        EmailVerification.objects.filter(email=email, is_verified=True).delete()

        refresh = RefreshToken.for_user(empresa)
        # Añadir ambos IDs al token para autenticación flexible
        refresh["empresa_id"] = empresa.id
        refresh["is_empresa"] = True
        response_data = {
            "message": "Registro de empresa exitoso",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            'empresa': empresa_data_serialized,
        }
        return Response(response_data, status=201)


class EmpresaJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token expirado")
        except jwt.DecodeError:
            raise exceptions.AuthenticationFailed("Token inválido")

        # Login como empresa
        empresa_id = payload.get("empresa_id")
        if empresa_id:
            try:
                empresa = Empresa.objects.get(id=empresa_id)
                return (empresa, token)
            except Empresa.DoesNotExist:
                raise exceptions.AuthenticationFailed("Empresa no encontrada")

        # Login como usuario normal
        usuario_id = payload.get("user_id")
        if usuario_id:
            from api.models import Usuario
            try:
                usuario = Usuario.objects.get(id=usuario_id)
                return (usuario, token)
            except Usuario.DoesNotExist:
                raise exceptions.AuthenticationFailed("Usuario no encontrado")

        raise exceptions.AuthenticationFailed("Token inválido")

# -----------------------------
# ViewSet principal para Empresa
# -----------------------------
class EmpresaViewSet(ModelViewSet):
    serializer_class = EmpresaSerializer
    authentication_classes = [EmpresaOrUsuarioJWTAuthentication]
    permission_classes = [IsEmpresaOrUsuarioAuthenticated]

    queryset = Empresa.objects.all()

    # def get_permissions(self):
    #     # 🔒 protege solo acciones que modifican
    #     if self.action in ['create', 'update', 'partial_update', 'destroy', 'seguir', 'dejar_de_seguir']:
    #         return [IsAuthenticated()]
    #     return [AllowAny()]
    
    def get_queryset(self):
        # Devuelve todas las empresas (para que un usuario pueda seguir cualquier empresa)
        return Empresa.objects.all()

    def perform_create(self, serializer):
        auth_entity = self.request.user  # Esto siempre será un AuthEntity
        real_obj = auth_entity.obj       # Aquí ya tienes Usuario o Empresa

        print(">>> AuthEntity.kind:", auth_entity.kind)
        print(">>> Real object:", type(real_obj), real_obj.id)

        # Solo un Usuario puede crear una empresa
        if auth_entity.kind != "usuario":
            raise ValidationError({"detail": "Solo un usuario puede registrar una empresa."})

        # Validar si ya tiene empresa
        if getattr(real_obj, "empresa", None):
            raise ValidationError({"non_field_errors": ["Este usuario ya tiene una empresa asociada."]})

        # Guardar empresa
        password = serializer.validated_data.pop("password", None)
        if password:
            serializer.save(usuario=real_obj, password=make_password(password))
        else:
            serializer.save(usuario=real_obj)



    # Acción para seguir una empresa
    @action(detail=True, methods=['post'])
    def seguir(self, request, pk=None):
        empresa = self.get_object()
        empresa.seguidores.add(request.user)
        return Response({"status": f"Ahora sigues a {empresa.nombre}"}, status=status.HTTP_200_OK)

    # Acción para dejar de seguir una empresa
    @action(detail=True, methods=['post'])
    def dejar_de_seguir(self, request, pk=None):
        empresa = self.get_object()
        empresa.seguidores.remove(request.user)
        return Response({"status": f"Has dejado de seguir a {empresa.nombre}"}, status=status.HTTP_200_OK)

# -----------------------------
# Endpoint de detalle de empresa
# -----------------------------
@api_view(['GET'])
def empresa_detail(request, pk):
    try:
        empresa = Empresa.objects.get(pk=pk)
    except Empresa.DoesNotExist:
        return Response({"error": "Empresa no encontrada"}, status=404)

    serializer = EmpresaSerializer(empresa, context={'request': request})
    return Response(serializer.data)


# -----------------------------
# Endpoint para obtener la empresa del usuario logueado
# -----------------------------
@api_view(['GET'])
def mi_empresa(request):
    user = request.user

    # Caso 1: el usuario autenticado ES una Empresa
    if isinstance(user, Empresa):
        empresa = user
    else:
        # Caso 2: el usuario es un Usuario con OneToOne hacia Empresa
        try:
            empresa = user.empresa
        except (AttributeError, Empresa.DoesNotExist):
            return Response({"empresa_id": None}, status=200)

    serializer = EmpresaSerializer(empresa, context={'request': request})
    data = serializer.data
    data['empresa_id'] = empresa.id
    return Response(data, status=200)



class EventoViewSet(viewsets.ModelViewSet):
    serializer_class = EventoSerializer
    authentication_classes = [EmpresaJWTAuthentication]
    permission_classes = [IsEmpresaOrUsuarioAuthenticated]

    def get_queryset(self):
        empresa_pk = self.kwargs.get('empresa_pk')
        qs = Evento2.objects.all().order_by('-id')
        if empresa_pk:
            return qs.filter(empresa_id=empresa_pk)
        return qs

    
    def perform_create(self, serializer):
        user = self.request.user

        # Detecta flujo: user con empresa asociada o empresa login directo
        if hasattr(user, "empresa"):  # user normal con empresa
            empresa_id = user.empresa.id
        else:  # si el usuario es la empresa misma
            empresa_id = user.id

        serializer.save(empresa_id=empresa_id)
        print("CREANDO EVENTO PARA EMPRESA ID:", empresa_id)

        
class TempImageUploadView(APIView):
    def post(self, request):
        serializer = TempImageSerializer(data=request.data)
        if serializer.is_valid():
            # Solo devolvemos la URL para guardarla temporalmente en el front
            return Response(serializer.validated_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EventoImagenViewSet(viewsets.ModelViewSet):
    queryset = EventoImagen.objects.all()
    serializer_class = EventoImagenSerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        evento_id = kwargs.get('evento_pk')  # si usas router anidado
        file = request.data.get("file")
        if not file:
            return Response({"error": "No se subió archivo"}, status=400)

        try:
            evento = Evento2.objects.get(id=evento_id)
        except Evento2.DoesNotExist:
            return Response({"error": "Evento no encontrado"}, status=404)

        try:
            url = upload_image_to_supabase(file)
            evento.imagenes.create(url=url)
            return Response({"url": url}, status=201)
        except Exception as e:
            import traceback
            traceback.print_exc()  # imprime stack completo en consola
            return Response({"error": str(e)}, status=500)


class EventosPublicosViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Evento2.objects.all().order_by('-id')  # orden por id
    serializer_class = EventoSerializer
    permission_classes = [AllowAny]  # público, no requiere token
    
    @action(detail=False, methods=['get'])
    def nearby(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if lat is None or lng is None:
            return Response({'detail': 'lat and lng query params are required'}, status=400)
        try:
            lat_f = float(lat)
            lng_f = float(lng)
        except ValueError:
            return Response({'detail': 'lat and lng must be floats'}, status=400)

        radius_km = float(request.query_params.get('radius_km', 10))  # default 10 km

        # Haversine formula
        haversine_sql = (
            "6371 * acos( "
            "cos(radians(%s)) * cos(radians(latitude)) * cos(radians(longitude) - radians(%s)) + "
            "sin(radians(%s)) * sin(radians(latitude)) "
            ")"
        )
        qs = Evento2.objects.annotate(
            distance=RawSQL(haversine_sql, (lat_f, lng_f, lat_f))
        ).filter(distance__lte=radius_km).order_by('distance')

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class EmpresaLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"detail": "Email y password requeridos."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            empresa = Empresa.objects.get(email_contacto=email)
        except Empresa.DoesNotExist:
            return Response({"detail": "Empresa no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not empresa.check_password(password):
            return Response({"detail": "Contraseña incorrecta."}, status=status.HTTP_401_UNAUTHORIZED)

        # Generar tokens con SimpleJWT
        refresh = RefreshToken.for_user(empresa)
        refresh["empresa_id"] = empresa.id
        refresh["email"] = empresa.email_contacto
        refresh["is_empresa"] = True

        empresa_data = EmpresaSerializer(empresa, context={"request": request}).data

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "empresa": empresa_data
        }, status=status.HTTP_200_OK)

    
class EmpresaMiPerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = request.user
        serializer = EmpresaSerializer(empresa, context={'request': request})
        return Response(serializer.data)


class EmpresaTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmpresaTokenObtainPairSerializer
    
# Endpoint para reenviar/regenerar el PIN de verificación por email
class EmpresaReenviarPinView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'Email requerido.'}, status=400)
        try:
            # Verifica si existe registro previo de verificación
            verif, created = EmailVerification.objects.get_or_create(email=email)
        except Exception:
            return Response({'detail': 'No existe registro de verificación para este email.'}, status=404)
        # Genera nuevo PIN
        pin = str(random.randint(100000, 999999))
        verif.code = pin
        verif.created_at = timezone.now()
        verif.expires_at = timezone.now() + timezone.timedelta(minutes=15)
        verif.is_verified = False
        verif.save()
        # Envía el correo
        send_mail(
            'Tu nuevo código de validación para empresa',
            f'Tu nuevo código de validación para empresa es: {pin}',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        return Response({'detail': 'Se ha enviado un nuevo pin de verificación al correo.'}, status=200)
    

class EmpresaPublicDetailView(RetrieveAPIView):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaPublicSerializer
    permission_classes = [AllowAny]  # 🔓 cualquiera puede acceder
    lookup_field = "id"  # se buscará por /<id>/
    

class EmpresaPublicEventosView(ListAPIView):
    serializer_class = EventoPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        empresa_id = self.kwargs["id"]
        return Evento2.objects.filter(empresa_id=empresa_id, empresa__activo=True)
    
@api_view(['GET'])
@permission_classes([AllowAny])
def empresas_por_ids(request):
    ids_param = request.query_params.get('ids', '')
    if not ids_param:
        return Response({"error": "Debe proporcionar ?ids="}, status=400)

    ids = [int(x) for x in ids_param.split(',') if x.isdigit()]
    empresas = Empresa.objects.filter(id__in=ids)
    serializer = EmpresaBulkSerializer(empresas, many=True, context={"request": request})

    return Response(serializer.data)

# Listar + crear (POST: crea o actualiza la calificación del usuario para esa empresa)
class EmpresaRatingsListCreateView(generics.ListCreateAPIView):
    serializer_class = RatingSerializer
    permission_classes = [IsUsuarioOrReadOnly]

    def get_queryset(self):
        empresa_pk = self.kwargs.get('empresa_pk')
        return Rating.objects.filter(empresa_id=empresa_pk).select_related('usuario')

    def perform_create(self, serializer):
        empresa_pk = self.kwargs.get('empresa_pk')
        empresa = get_object_or_404(Empresa, pk=empresa_pk)

        user = self.request.user
        # Si el user es AuthEntity tipo 'empresa' -> bloquear (no deben calificar)
        kind = getattr(user, 'kind', None)
        # si estamos en el caso que request.user es AuthEntity("usuario", Usuario) o instancia Usuario:
        if kind == 'empresa' or getattr(user, 'is_empresa', False):
            # no permitimos que una empresa califique
            raise SoloUsuariosPuedenCalificar()

        # No permitir que el dueño/admin de la empresa (si es un Usuario ligado) se califique a sí mismo
        if hasattr(user, 'empresa') and user.empresa and user.empresa.id == empresa.id:
            raise NoPuedesCalificarTuEmpresa()

        # Si ya existe rating del usuario para esa empresa -> actualizar
        rating_obj, created = Rating.objects.update_or_create(
            empresa=empresa,
            usuario=user if getattr(user, 'kind', None) != 'empresa' else None,  # cuidado con AuthEntity
            defaults={
                'rating': serializer.validated_data['rating'],
                'comentario': serializer.validated_data.get('comentario', '')
            }
        )
        # Si user es AuthEntity, puede que el objeto real esté en .obj
        # Manejo robusto:
        # Re-implementando: vamos a forzar usuario desde request.user.obj si existe:
        usuario_obj = getattr(user, 'obj', user)
        rating_obj, created = Rating.objects.update_or_create(
            empresa=empresa,
            usuario=usuario_obj,
            defaults={
                'rating': serializer.validated_data['rating'],
                'comentario': serializer.validated_data.get('comentario', '')
            }
        )
        self._saved = rating_obj  # por si quieres usarlo

# detalle, editar o borrar (solo el autor puede editar o borrar)
class RatingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RatingSerializer
    queryset = Rating.objects.all()

    def get_permissions(self):
        if self.request.method in ('GET',):
            return [AllowAny()]
        # PUT/PATCH/DELETE -> solo autor
        return [IsUsuarioOrReadOnly()]

    def check_object_permissions(self, request, obj):
        # override para que solo el autor pueda editar/eliminar
        if request.method in ('PUT', 'PATCH', 'DELETE'):
            usuario = getattr(request.user, 'obj', request.user)
            if obj.usuario_id != getattr(usuario, 'id', None):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Solo el autor puede editar/borrar su calificación.")
        super().check_object_permissions(request, obj)


class EmpresaEventoCreateView(APIView):
    def post(self, request):
        serializer = EmpresaEventoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class UsuarioEventoViewSet(viewsets.ModelViewSet):
    serializer_class = UsuarioEventoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UsuarioEvento.objects.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)