from httpx import request
from .models import UsuarioEvento
from .serializers import MiEmpresaSerializer, UsuarioEventoSerializer
# ViewSet para eventos guardados por usuario
from rest_framework import viewsets, permissions
from .models import (
    Empresa, Evento2, Rating,
    EventoImagen,
    EmpresaRedSocial,
    NotificacionEmpresa
    )
from .serializers import (
    EmpresaTokenObtainPairSerializer,
    EmpresaPublicSerializer,
    EmpresaSerializer,
    RatingSerializer,
    EventoImagenSerializer,
    TempImageSerializer,
    EmpresaBulkSerializer,
    NotificacionEmpresaSerializer,
    EventoListSerializer,
    
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
from .serializers import EmpresaSerializer, EventoSerializer, EmpresaRegistroSerializer, EventoPublicSerializer, EmpresaEventoSerializer, EmpresaRedSocialSerializer
from rest_framework.exceptions import ValidationError
from rest_framework import viewsets
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password
import jwt
import os
import uuid
import requests
from datetime import datetime
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
from django.contrib.auth import get_user_model
from django.db.models.expressions import RawSQL
from rest_framework.parsers import MultiPartParser, FormParser
from .supabase_client import supabase, upload_image_to_supabase, auto_delete_file_from_supabase, delete_file_from_supabase
from .services import upload_empresa_profile_picture, delete_empresa_profile_picture, CustomPagination
from django.conf import settings
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .services import asignar_empresa_por_menor_carga, NoStaffAvailable, validate_image_with_sightengine, register_profile_view, register_event_view
from .notifications import notificar_asignacion_empresa
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from api.serializers import RegisterSerializer
from django.db import transaction
from .permissions import IsEmpresaAuthenticated
from django.db.models import Q, Count

Usuario = get_user_model()


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
        if Usuario.objects.filter(email=email).exists() or Empresa.objects.filter(email=email).exists():
            return Response({'error': 'El correo ya esta en uso.'}, status=status.HTTP_400_BAD_REQUEST)
        if phone:
            phone = str(phone)
            # 1. Verificar que no exista en otra empresa
            if Empresa.objects.filter(phone=phone).exists():
                return Response({'error': 'El número ya está en uso.'}, status=status.HTTP_400_BAD_REQUEST)

            # 2. Verificar que no exista en Usuario, salvo que esté vinculado a esta empresa
            usuario_con_phone = Usuario.objects.filter(phone=phone).first()
            if usuario_con_phone:
                # Si el usuario no está vinculado a esta empresa, error
                if not Empresa.objects.filter(usuario_id=usuario_con_phone.id).exists():
                    return Response({'error': 'El número ya está en uso.'}, status=status.HTTP_400_BAD_REQUEST)
                
        # Generar y guardar pin y datos temporales
        pin = str(random.randint(100000, 999999))
        EmailVerification.objects.update_or_create(
            email=email,
            defaults={
                'code': pin,
                'created_at': timezone.now(),
                'expires_at': timezone.now() + timezone.timedelta(minutes=10),
                'is_verified': False,
                'purpose': 'empresa_register'
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
            'nombre', 'rif', 'descripcion', 'lugar', 'phone', 'email_contacto', 'logo',
        ]
        redes_sociales = empresa_data.get('redes_sociales', [])
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
        # Guardar redes sociales
        
        url_validator = URLValidator()
        for red in redes_sociales:
            # Puede ser string (url) o dict {'tipo':..., 'url':...}
            tipo = 'instagram'
            url = ''
            if isinstance(red, dict):
                tipo = red.get('tipo', 'instagram')
                url = red.get('url', '')
            else:
                url = red

            if not url:
                continue

            # Normalizar (anteponer https:// si es necesario)
            url = url.strip()
            if not url.lower().startswith('http://') and not url.lower().startswith('https://'):
                url = 'https://' + url

            try:
                url_validator(url)
            except DjangoValidationError:
                # ignorar urls inválidas
                continue

            EmpresaRedSocial.objects.create(empresa=empresa, url=url, tipo=tipo)

        # 🔹 Asignación automática al staff con menor carga
        try:
            asignar_empresa_por_menor_carga(empresa, nombre_grupo="Verificadores")
        except NoStaffAvailable:
            pass  # queda pendiente sin assigned_to
        else:
            if empresa.assigned_to:
                notificar_asignacion_empresa(empresa)
        
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

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return MiEmpresaSerializer
        return EmpresaSerializer
    
    @action(detail=True, methods=["post"], url_path="upload-foto")
    def upload_foto(self, request, pk=None):
        empresa = self.get_object()
        file = request.data.get("file")

        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        if not validate_image_with_sightengine(file):
            return Response(status=status.HTTP_400_BAD_REQUEST)
        
        file.seek(0)

        
        # Si ya tiene logo, eliminarlo primero
        if empresa.logo:
            delete_empresa_profile_picture(empresa.logo)

        # Subir nueva
        public_url = upload_empresa_profile_picture(file, empresa.id)
        empresa.logo = public_url
        empresa.save()

        return Response({"logo": public_url}, status=200)
    
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

        # Guardar empresa y redes sociales
        password = serializer.validated_data.pop("password", None)
        redes = self.request.data.get('redes_sociales', [])
        empresa = None
        if password:
            empresa = serializer.save(usuario=real_obj, password=make_password(password))
        else:
            empresa = serializer.save(usuario=real_obj)
        # Guardar redes sociales
        
        url_validator = URLValidator()
        for red in redes:
            tipo = 'instagram'
            url = ''
            if isinstance(red, dict):
                tipo = red.get('tipo', 'instagram')
                url = red.get('url', '')
            else:
                url = red

            if not url:
                continue
            # Normalizar
            url = url.strip()
            if not url.lower().startswith('http://') and not url.lower().startswith('https://'):
                url = 'https://' + url

            try:
                url_validator(url)
            except DjangoValidationError:
                continue

            EmpresaRedSocial.objects.create(empresa=empresa, url=url, tipo=tipo)

        # 🔹 Aquí añadimos la asignación automática
        try:
            asignar_empresa_por_menor_carga(empresa, nombre_grupo="Verificadores")
        except NoStaffAvailable:
            pass  # queda pendiente sin assigned_to
        else:
            if empresa.assigned_to:
                notificar_asignacion_empresa(empresa)

    def perform_update(self, serializer):
        """Al actualizar una empresa sincronizamos sus redes sociales y logueamos el proceso."""
        empresa = serializer.instance
        serializer.save()

        redes = self.request.data.get('redes_sociales', None)
        print(f"[SYNC REDES] PATCH recibido para empresa {empresa.id}")
        print(f"[SYNC REDES] Lista recibida: {redes}")
        if redes is None:
            print("[SYNC REDES] No se recibió redes_sociales, no se sincroniza nada.")
            return

        url_validator = URLValidator()
        seen_tipos = set()
        tipos_recibidos = []

        for red in redes:
            tipo = 'instagram'
            url = ''
            if isinstance(red, dict):
                tipo = red.get('tipo', 'instagram')
                url = red.get('url', '')
            else:
                url = red

            if not url:
                continue
            
            print("Actualizando url para tipo:", tipo)
            url = url.strip()
            if not url.lower().startswith('https://') and not url.lower().startswith('mailto:'):
                url = 'https://'+ tipo + '.com/' + url
                print(f"[SYNC REDES] Normalizando URL para tipo {tipo}: {url}")

            try:
                url_validator(url)
            except DjangoValidationError:
                print(f"[SYNC REDES] URL inválida ignorada: {url}")
                continue

            EmpresaRedSocial.objects.update_or_create(
                empresa=empresa,
                tipo=tipo,
                defaults={'url': url}
            )
            seen_tipos.add(tipo)
            tipos_recibidos.append(tipo)

        print(f"[SYNC REDES] Tipos recibidos: {tipos_recibidos}")
        # Eliminar redes cuyo tipo no está en la lista entrante
        if redes == []:
            # Si la lista recibida está vacía, eliminar todas las redes
            eliminadas = EmpresaRedSocial.objects.filter(empresa=empresa)
            for r in eliminadas:
                print(f"[SYNC REDES] Eliminando red: id={r.id}, tipo={r.tipo}, url={r.url}")
            eliminadas.delete()
        elif seen_tipos:
            eliminadas = EmpresaRedSocial.objects.filter(empresa=empresa).exclude(tipo__in=seen_tipos)
            for r in eliminadas:
                print(f"[SYNC REDES] Eliminando red: id={r.id}, tipo={r.tipo}, url={r.url}")
            eliminadas.delete()

    # Acción para seguir una empresa
    @action(detail=True, methods=['post'])
    def seguir(self, request, pk=None):
        empresa = self.get_object()
        auth_entity = request.user

        if not auth_entity or not getattr(auth_entity, "is_authenticated", False):
            return Response(
                {"detail": "Debes iniciar sesión para seguir empresas."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        usuario = None
        if getattr(auth_entity, "kind", None) == "usuario":
            usuario = auth_entity.obj
        elif getattr(auth_entity, "kind", None) == "empresa":
            # 👇 empresa ligada a un usuario
            usuario = getattr(auth_entity.obj, "usuario", None)

        if not usuario:
            return Response(
                {"detail": "Solo los usuarios pueden seguir empresas."},
                status=status.HTTP_403_FORBIDDEN
            )

        if empresa.seguidores.filter(id=usuario.id).exists():
            return Response({"detail": "Ya sigues a esta empresa."}, status=405)

        empresa.seguidores.add(usuario)
        return Response(
            {"status": f"Ahora sigues a {empresa.nombre}"},
            status=status.HTTP_200_OK
        )


    # Acción para dejar de seguir una empresa
    @action(detail=True, methods=['post'])
    def dejar_de_seguir(self, request, pk=None):
        empresa = self.get_object()
        auth_entity = request.user

        if not auth_entity or not getattr(auth_entity, "is_authenticated", False):
            return Response(
                {"detail": "Debes iniciar sesión para dejar de seguir empresas."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        usuario = None
        if getattr(auth_entity, "kind", None) == "usuario":
            usuario = auth_entity.obj
        elif getattr(auth_entity, "kind", None) == "empresa":
            usuario = getattr(auth_entity.obj, "usuario", None)

        if not usuario:
            return Response(
                {"detail": "Solo los usuarios pueden dejar de seguir empresas."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not empresa.seguidores.filter(id=usuario.id).exists():
            return Response({"detail": "No sigues a esta empresa."}, status=400)

        empresa.seguidores.remove(usuario)
        return Response(
            {"status": f"Has dejado de seguir a {empresa.nombre}"},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["get"])
    def seguidores(self, request, pk=None):
        empresa = self.get_object()
        seguidores = empresa.seguidores.all().values("id", "username")
        return Response(seguidores)

    # --- Redes sociales: listar y crear/actualizar ---
    @action(detail=True, methods=["get"], url_path="redes")
    def redes(self, request, pk=None):
        """Lista las redes sociales asociadas a la empresa."""
        empresa = self.get_object()
        redes = empresa.redes.all()
        serializer = EmpresaRedSocialSerializer(redes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="redes")
    def add_red(self, request, pk=None):
        """Crea o actualiza (por tipo) una red social para la empresa.

        Si ya existe una red del mismo tipo se actualiza su URL. Se normaliza la URL
        y se valida.
        """
        empresa = self.get_object()

        # Permitir sólo al propietario (empresa autenticada) o al usuario propietario
        # de la empresa modificar sus redes.
        auth_entity = request.user
        can_modify = False
        # AuthEntity con .kind y .obj
        if getattr(auth_entity, "kind", None) == "empresa" and getattr(auth_entity, "obj", None):
            if auth_entity.obj.id == empresa.id:
                can_modify = True
        elif getattr(auth_entity, "kind", None) == "usuario" and getattr(auth_entity, "obj", None):
            # usuario vinculado como administrador de la empresa
            if getattr(auth_entity.obj, "empresa_id", None) == empresa.id:
                can_modify = True
        else:
            # por si request.user es directamente instancia Usuario o Empresa
            if isinstance(auth_entity, type(empresa)) and getattr(auth_entity, "id", None) == empresa.id:
                can_modify = True
            elif hasattr(auth_entity, "empresa") and getattr(auth_entity.empresa, "id", None) == empresa.id:
                can_modify = True

        if not can_modify:
            return Response({"detail": "No tienes permisos para modificar las redes de esta empresa."}, status=403)

        tipo = request.data.get("tipo", "instagram")
        url = request.data.get("url", "") or request.data.get("value", "")
        url = url.strip() if isinstance(url, str) else url
        # Normalizar esquema si falta
        if url and not (url.lower().startswith("http://") or url.lower().startswith("https://")):
            url = "https://" + url

        # Validar URL
        url_validator = URLValidator()
        try:
            url_validator(url)
        except DjangoValidationError:
            return Response({"detail": "URL inválida."}, status=400)

        # Crear o actualizar por tipo (unique_together)
        obj, created = EmpresaRedSocial.objects.update_or_create(
            empresa=empresa,
            tipo=tipo,
            defaults={"url": url}
        )

        status_code = 201 if created else 200
        serializer = EmpresaRedSocialSerializer(obj)
        return Response(serializer.data, status=status_code)

    @action(detail=True, methods=["patch", "delete"], url_path=r"redes/(?P<red_pk>[^/.]+)")
    def redes_detail(self, request, pk=None, red_pk=None):
        """Editar (PATCH) o eliminar (DELETE) una red social por su id.

        PATCH: acepta 'url' (y opcionalmente 'tipo' aunque cambiar tipo puede fallar por unique).
        DELETE: borra el registro.
        """
        empresa = self.get_object()

        # permiso igual al de add_red
        auth_entity = request.user
        can_modify = False
        if getattr(auth_entity, "kind", None) == "empresa" and getattr(auth_entity, "obj", None):
            if auth_entity.obj.id == empresa.id:
                can_modify = True
        elif getattr(auth_entity, "kind", None) == "usuario" and getattr(auth_entity, "obj", None):
            if getattr(auth_entity.obj, "empresa_id", None) == empresa.id:
                can_modify = True
        else:
            if isinstance(auth_entity, type(empresa)) and getattr(auth_entity, "id", None) == empresa.id:
                can_modify = True
            elif hasattr(auth_entity, "empresa") and getattr(auth_entity.empresa, "id", None) == empresa.id:
                can_modify = True

        if not can_modify:
            return Response({"detail": "No tienes permisos para modificar las redes de esta empresa."}, status=403)

        red = get_object_or_404(EmpresaRedSocial, pk=red_pk, empresa=empresa)

        if request.method == "DELETE":
            print(f"[BORRAR RED SOCIAL] Empresa: {empresa.id} - Red: {red.id} ({red.tipo}) - URL: {red.url}")
            red.delete()
            print(f"[BORRAR RED SOCIAL] Eliminada correctamente de la BD.")
            return Response(status=204)

        # PATCH
        url = request.data.get("url")
        tipo = request.data.get("tipo")
        if url:
            url = url.strip()
            if url and not (url.lower().startswith("http://") or url.lower().startswith("https://")):
                url = "https://" + url
            try:
                URLValidator()(url)
            except DjangoValidationError:
                return Response({"detail": "URL inválida."}, status=400)
            red.url = url

        if tipo and tipo != red.tipo:
            # verificar que no exista otra red del mismo tipo para esta empresa
            if EmpresaRedSocial.objects.filter(empresa=empresa, tipo=tipo).exclude(pk=red.pk).exists():
                return Response({"detail": "Ya existe una red de ese tipo para esta empresa."}, status=400)
            red.tipo = tipo

        red.save()
        serializer = EmpresaRedSocialSerializer(red)
        return Response(serializer.data)

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

    def get_serializer_class(self):
        # Para list/retrieve usamos el serializer reducido
        if self.action in ["list", "retrieve"]:
            return EventoListSerializer
        return EventoSerializer
    
    def perform_create(self, serializer):
        user = self.request.user

        # Detecta flujo: user con empresa asociada, AuthEntity o empresa login directo
        empresa_id = None
        # AuthEntity wrapper (tiene .kind y .obj)
        if hasattr(user, 'kind') and hasattr(user, 'obj'):
            real_obj = getattr(user, 'obj')
            if hasattr(real_obj, 'empresa'):
                empresa_id = real_obj.empresa.id
            else:
                empresa_id = getattr(real_obj, 'id', None)
        elif hasattr(user, 'empresa'):
            # Usuario normal con OneToOne a Empresa
            empresa_id = user.empresa.id
        else:
            # Posiblemente el usuario es directamente una Empresa
            empresa_id = getattr(user, 'id', None)

        # Validar que la empresa exista y esté verificada
        try:
            empresa = Empresa.objects.get(id=empresa_id)
        except Exception:
            raise ValidationError({"detail": "Empresa no encontrada."})

        if not getattr(empresa, 'company_verified', False):
            # Bloqueamos la creación si la empresa no está verificada
            raise PermissionDenied("Empresa no verificada. No puede crear eventos hasta ser verificada.")

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
        evento_id = kwargs.get("evento_pk")
        files = request.FILES.getlist("files")
        
        print("FILES RECIBIDOS:", request.FILES)
        print("DATA RECIBIDA:", request.data)


        if not files:
            return Response({"error": "No se subieron archivos"}, status=400)

        try:
            evento = Evento2.objects.get(id=evento_id)
        except Evento2.DoesNotExist:
            return Response({"error": "Evento no encontrado"}, status=404)

        empresa_id = evento.empresa_id
        uploaded_paths = []
        uploaded_urls = []
        saved_records = []

        try:
            with transaction.atomic():
                for file in files:
                    
                    is_valid = self.validate_image_with_sightengine(file)
                    print(f"Validación {file.name}: {is_valid}")
                    # 1. Validar con Sightengine (tu lógica aquí)
                    if not is_valid:
                        # rollback: borrar imágenes ya subidas
                        self.rollback_supabase(uploaded_paths)
                        # borrar registros creados
                        for r in saved_records:
                            r.delete()
                        
                        evento.delete()
                        
                        return Response(
                            {"error": f"La imagen {file.name} no pasó validación. Se canceló la operación."},
                            status=400,
                        )

                    # 2. Subir a Supabase
                    path, url = upload_image_to_supabase(file, empresa_id, evento_id)
                    print("Subida correcta:", path, url)
                    uploaded_paths.append(path)
                    uploaded_urls.append(url)
                    

                    
                    print("Creando registro en DB:", {"path": path, "url": url})
                    # 3. Crear registro en DB
                    record = evento.imagenes.create(path=path, url=url)
                    saved_records.append(record)

            return Response({"urls": uploaded_urls}, status=201)

        except Exception as e:
            print(f"🔥 Error general en create: {e}")
            # rollback: eliminar uploads y registros
            self.rollback_supabase(uploaded_paths)
            for r in saved_records:
                r.delete()
            return Response({"error": str(e)}, status=500)

    def rollback_supabase(self, paths):
        """Elimina de Supabase todas las rutas pasadas"""
        bucket = "eventos_publicos"
        for p in paths:
            try:
                supabase.storage.from_(bucket).remove([p])
                print(f"🗑️ Eliminada de Supabase: {p}")
            except Exception as e:
                print(f"⚠️ Error al eliminar {p}: {e}")
    
    
    def validate_image_with_sightengine(self, file):
        """
        Envía la imagen a Sightengine y valida que sea segura.
        Retorna True si la imagen es válida, False si no.
        """
        

        api_user =  settings.SIGHTENGINE_API_USER
        api_secret = settings.SIGHTENGINE_API_SECRET

        try:
            # Asegurar que el puntero esté al inicio
            file.seek(0)
            response = requests.post(
                "https://api.sightengine.com/1.0/check.json",
                files={"media": file},
                data={"models": "nudity,wad,offensive", "api_user": api_user, "api_secret": api_secret},
            )
            result = response.json()

            # 👇 Lógica simple: puedes ajustar los umbrales
            if result.get("status") != "success":
                return False

            nudity = result.get("nudity", {})
            if nudity.get("safe", 0) < 0.85:  # menos del 85% seguro
                return False

            return True
        except Exception:
            return False
   

class EventosPublicosViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EventoSerializer
    permission_classes = [AllowAny]
    pagination_class = CustomPagination

    def get_queryset(self):
        """
        Devuelve eventos futuros y aplica filtros opcionales: category y search.
        """
        queryset = Evento2.objects.annotate(views_count=Count('views')).filter(fecha_evento__gte=timezone.now()).order_by('fecha_evento')

        # Filtrar por categoría si se recibe en query params
        categoria = self.request.query_params.get('categoria')
        if categoria:
            queryset = queryset.filter(categoria__icontains=categoria)


        # Filtrar por búsqueda (opcional)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(titulo__icontains=search) |
                Q(empresa__nombre__icontains=search)   # <-- aquí añadimos búsqueda por empresa
            ).order_by('fecha_evento')

        return queryset

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

        radius_km = float(request.query_params.get('radius', 10))

        haversine_sql = (
            "6371 * acos( "
            "cos(radians(%s)) * cos(radians(latitude)) * cos(radians(longitude) - radians(%s)) + "
            "sin(radians(%s)) * sin(radians(latitude)) "
            ")"
        )
        qs = Evento2.objects.annotate(
            distance=RawSQL(haversine_sql, (lat_f, lng_f, lat_f))
        ).filter(distance__lte=radius_km).order_by('distance', 'fecha_evento')

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def promoted(self, request):
        """
        Devuelve hasta 10 eventos promovidos (destacados).
        - Si hay <=10 → se muestran siempre.
        - Si hay >10 → rota cada hora en bloques de 10.
        """
        qs = Evento2.objects.filter(
            promote=True,
            fecha_evento__gte=timezone.now()
        ).order_by('fecha_evento')

        eventos = list(qs)

        if len(eventos) <= 10:
            selected = eventos
        else:
            # Semilla basada en la hora actual (ej: 2025100319)
            seed = datetime.now().strftime("%Y%m%d%H")
            rnd = random.Random(seed)
            rnd.shuffle(eventos)
            selected = eventos[:10]

        serializer = self.get_serializer(selected, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        evento = self.get_object()

        # Registrar vista si el usuario está autenticado
        if request.user.is_authenticated:
            register_event_view(evento, request.user)

        serializer = self.get_serializer(evento)
        return Response(serializer.data)
    

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

    
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
        verif.expires_at = timezone.now() + timezone.timedelta(minutes=10)
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
    
    def retrieve(self, request, *args, **kwargs):
        empresa = self.get_object()
        
        user = request.user
        if hasattr(user, "kind") and hasattr(user, "obj"):
            if user.kind == "usuario":
                register_profile_view(empresa, user.obj)
        elif getattr(user, "is_authenticated", False):
            register_profile_view(empresa, user)


        return super().retrieve(request, *args, **kwargs)
    

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
    

    permission_classes = [permissions.IsAuthenticated]


    def get_queryset(self):
        queryset = UsuarioEvento.objects.filter(usuario=self.request.user).order_by('-fecha_guardado')
        evento_id = self.request.query_params.get('evento')
        if evento_id:
            queryset = queryset.filter(evento_id=evento_id)
        # Filtrado por fecha si se usan los parámetros
        fecha_inicio = self.request.query_params.get('fecha_inicio')
        fecha_fin = self.request.query_params.get('fecha_fin')
        if fecha_inicio and fecha_fin:
            queryset = queryset.filter(evento__fecha_evento__range=[fecha_inicio, fecha_fin])
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        # Paginación manual con limit/offset
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        total = queryset.count()
        paginated_qs = queryset[offset:offset+limit]
        serializer = self.get_serializer(paginated_qs, many=True)
        return Response({
            'results': serializer.data,
            'total': total,
            'limit': limit,
            'offset': offset
        })

    def get_serializer_class(self):
        # Use lightweight serializer for calendar listing
        if self.action == 'list' and self.request.query_params.get('calendar') == '1':
            from .serializers import UsuarioEventoCalendarSerializer
            return UsuarioEventoCalendarSerializer
        return UsuarioEventoSerializer

    def perform_create(self, serializer):
        usuario = self.request.user
        evento = serializer.validated_data.get('evento')
        if UsuarioEvento.objects.filter(usuario=usuario, evento=evento).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'Ya guardaste este evento.'})
        serializer.save(usuario=usuario)
        
class UsuarioComentariosView(APIView):
    """
    Vista para obtener todos los comentarios que ha publicado un usuario
    """
    permission_classes = [IsUsuarioOrReadOnly]
    authentication_classes = [EmpresaOrUsuarioJWTAuthentication]

    def get(self, request):
        """
        Obtiene todos los comentarios (ratings con comentario) que ha publicado el usuario autenticado
        """
        auth_entity = request.user
        real_obj = getattr(auth_entity, "obj", None)
        
        # Solo usuarios pueden tener comentarios
        if not auth_entity or getattr(auth_entity, "kind", None) != "usuario":
            return Response(
                {"detail": "Solo los usuarios pueden tener comentarios."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Obtener todos los ratings del usuario que tengan comentario
        comentarios = Rating.objects.filter(
            usuario=real_obj,
            comentario__isnull=False
        ).exclude(comentario='').select_related('empresa').order_by('-creado_en')

        # Serializar los datos
        comentarios_data = []
        for comentario in comentarios:
            comentarios_data.append({
                'id': comentario.id,
                'empresa_nombre': comentario.empresa.nombre,
                'empresa_id': comentario.empresa.id,
                'rating': comentario.rating,
                'comentario': comentario.comentario,
                'creado_en': comentario.creado_en,
                'actualizado_en': comentario.actualizado_en,
                'usuario_username': comentario.usuario.username,
            })

        return Response(comentarios_data, status=status.HTTP_200_OK)


class EmpresaValidarPinConUsuarioView(generics.CreateAPIView):
    serializer_class = EmpresaRegistroSerializer
    permission_classes = [IsEmpresaOrUsuarioAuthenticated]
    authentication_classes = [EmpresaOrUsuarioJWTAuthentication]

    def create(self, request, *args, **kwargs):
        auth_entity = request.user
        real_obj = getattr(auth_entity, "obj", None)

        if not auth_entity or getattr(auth_entity, "kind", None) != "usuario":
            return Response({"detail": "Solo un usuario puede registrar una empresa."}, status=403)

        pin = request.data.get("pin")
        email = request.data.get("email")
        empresa_data = request.data.get("empresa", {})

        print("empresa_data para serializer:", empresa_data)

        # 🔹 Validar PIN
        try:
            verif = EmailVerification.objects.get(email=email, code=pin, is_verified=False)
        except EmailVerification.DoesNotExist:
            return Response({"detail": "PIN inválido o expirado."}, status=400)

        if verif.expires_at < timezone.now():
            return Response({"detail": "PIN expirado."}, status=400)

        verif.is_verified = True
        verif.save()

        # Extraer password y redes sociales
        password = request.data.get("password")
        redes_sociales = empresa_data.pop("redes_sociales", [])

        # Filtrar campos válidos para Empresa
        empresa_fields = ["nombre", "rif", "descripcion", "lugar", "phone", "email_contacto", "logo"]
        empresa_data = {k: v for k, v in empresa_data.items() if k in empresa_fields}

        # Crear empresa vinculada al usuario
        empresa = Empresa.objects.create(
            usuario=real_obj,
            password=make_password(password) if password else None,
            email =email,
            **empresa_data
        )

        # Guardar redes sociales
        from .models import EmpresaRedSocial
        for red in redes_sociales:
            if isinstance(red, dict):
                tipo = red.get('tipo', 'instagram')
                url = red.get('url', '')
            else:
                tipo = 'instagram'
                url = red
            if url:
                EmpresaRedSocial.objects.create(empresa=empresa, url=url, tipo=tipo)

        # Asignación automática
        try:
            asignar_empresa_por_menor_carga(empresa, nombre_grupo="Verificadores")
        except NoStaffAvailable:
            pass
        else:
            if empresa.assigned_to:
                notificar_asignacion_empresa(empresa)

        empresa_serialized = EmpresaSerializer(empresa, context={"request": request}).data

        # Limpiar PINs antiguos
        EmailVerification.objects.filter(email=email, is_verified=True).delete()

        return Response(
            {"message": "Empresa creada exitosamente", "empresa": empresa_serialized},
            status=201
        )

class NotificacionEmpresaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificacionEmpresaSerializer
    permission_classes = [IsEmpresaOrUsuarioAuthenticated]  # o personalizada si usas token por empresa

    def get_queryset(self):
        empresa_id = self.kwargs["empresa_pk"]  # 👈 no "id"
        return NotificacionEmpresa.objects.filter(empresa_id=empresa_id).order_by('-timestamp')

