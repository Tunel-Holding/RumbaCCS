from api.models import EmailVerification, Usuario
from django.utils import timezone
import random
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.decorators import action, api_view
from rest_framework import status
from .serializers import EmpresaSerializer, EventoSerializer, EmpresaRegistroSerializer
from rest_framework.exceptions import ValidationError
from rest_framework import viewsets, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.renderers import JSONRenderer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password, check_password
import jwt
import datetime
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import EmpresaTokenObtainPairSerializer
from rest_framework.permissions import BasePermission
from .models import Empresa, Evento2, Usuario
from .auth_backend import EmpresaOrUsuarioJWTAuthentication
from .permissions import IsEmpresaAuthenticated, IsEmpresaOrUsuarioAuthenticated

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
    try:
        empresa = request.user.empresa  # OneToOneField garantiza máximo una empresa
    except Empresa.DoesNotExist:
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
        if hasattr(user, "empresa"):
            empresa = user.empresa
        else:
            empresa = user

        serializer.save(empresa=empresa)
        print("CREANDO EVENTO PARA EMPRESA:", empresa.id)
        print("DATOS POST:", self.request.data)
        

class EventosPublicosViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Evento2.objects.all().order_by('-id')  # orden por id
    serializer_class = EventoSerializer
    permission_classes = [AllowAny]  # público, no requiere token

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