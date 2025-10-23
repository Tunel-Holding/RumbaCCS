import email
from django.shortcuts import render
from rest_framework import viewsets, permissions, generics, status
from django.contrib.auth import get_user_model, authenticate
from empresa.serializers import EmpresaSerializer
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import LoginUnificadoSerializer, RegisterSerializer, UserPublicSerializer, MyTokenObtainPairSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer, NotificacionUsuarioSerializer
from .models import EmailVerification, Usuario, NotificacionUsuario
from empresa.models import Empresa
from django.core.mail import send_mail
from django.utils import timezone
import random
from django.conf import settings
from empresa.services import validate_image_with_sightengine
from .services import upload_user_profile_picture, delete_user_profile_picture
from rest_framework_simplejwt.views import TokenViewBase
from rest_framework_simplejwt.settings import api_settings
from rest_framework.permissions import AllowAny
from django.core.cache import cache
from django.db.models import Count, Avg, Exists, OuterRef
from rest_framework_simplejwt.serializers import TokenRefreshSerializer


Usuario = get_user_model()

class SafeTokenRefreshView(TokenViewBase):
    """
    TokenRefreshView que funciona tanto para Usuario como para Empresa.
    Solo captura el caso en que el token apunta a un objeto que ya no existe.
    """
    serializer_class = TokenRefreshSerializer  

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except (Usuario.DoesNotExist, Empresa.DoesNotExist):
            return Response(
                {'detail': 'Usuario o Empresa no existe'},
                status=status.HTTP_401_UNAUTHORIZED
            )

class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserPublicSerializer

    def get_object(self):
        return self.request.user


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class UnifiedLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"detail": "Email y password requeridos."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 🔹 Intentar autenticación como usuario normal
        user = authenticate(request, email=email, password=password)
        if user:
            serializer = MyTokenObtainPairSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        # 🔹 Si no es usuario, intentar con empresa
        try:
            empresa = Empresa.objects.get(email_contacto=email)
        except Empresa.DoesNotExist:
            return Response({"detail": "Credenciales inválidas."}, status=status.HTTP_401_UNAUTHORIZED)

        if not empresa.check_password(password):
            return Response({"detail": "Contraseña incorrecta."}, status=status.HTTP_401_UNAUTHORIZED)

        # 🔹 Generar tokens (igual que el endpoint viejo de empresa)
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

class RegistroUsuarioView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        data = request.data
        email = data.get('email')
        phone = data.get('phone')
        phone = str(phone)
        print('Este es el telefono', phone)
        if not email:
            return Response({'error': 'Email requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        code = str(random.randint(100000, 999999))
        expires_at = timezone.now() + timezone.timedelta(minutes=10)
        # Si ya existe, actualiza el código y la expiración
        if Usuario.objects.filter(email=email).exists():
            return Response({'error': 'El correo ya esta en uso.'}, status=status.HTTP_400_BAD_REQUEST)
        if phone.startswith('0'):
            phone = phone[1:]
        if Usuario.objects.filter(phone=phone).exists() or Empresa.objects.filter(phone=phone).exists():
            return Response({'error': 'El numero de telefono ya esta en uso.'}, status=status.HTTP_400_BAD_REQUEST)
        
        EmailVerification.objects.update_or_create(
            email=email,
            defaults={
                'code': code,
                'expires_at': expires_at,
                'is_verified': False,
                'purpose': 'register'  # O el propósito que corresponda

            }
        )
        send_mail(
            'Tu código de verificación',
            f'Tu código es: {code}',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        return Response({'message': 'Se ha enviado un código de verificación a tu correo.'}, status=status.HTTP_200_OK)

class SendVerificationCodeView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        code = str(random.randint(100000, 999999))
        expires_at = timezone.now() + timezone.timedelta(minutes=10)
        EmailVerification.objects.update_or_create(
            email=email,
            defaults={
                'code': code,
                'expires_at': expires_at,
                'is_verified': False
            }
        )
        
        print(settings.EMAIL_HOST_USER)
        
        send_mail(
            'Tu código de verificación',
            f'Tu código es: {code}',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        return Response({'message': 'Código enviado.'}, status=status.HTTP_200_OK)

class VerifyCodeView(APIView):
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        if not email or not code:
            return Response({'error': 'Email y código requeridos.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            verification = EmailVerification.objects.get(email=email, code=code)
        except EmailVerification.DoesNotExist:
            return Response({'error': 'Código incorrecto.'}, status=status.HTTP_400_BAD_REQUEST)
        if verification.expires_at < timezone.now():
            return Response({'error': 'Código expirado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        verification.is_verified = True
        verification.save()
        
        return Response({'message': 'Correo verificado.'}, status=status.HTTP_200_OK)

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UserPublicSerializer

    @action(detail=True, methods=["get"], url_path="empresas-seguidas")
    def empresas_seguidas(self, request, pk=None):
        usuario = self.get_object()
        cache_key = f"empresas_seguidas_{usuario.id}_mini"
        data = cache.get(cache_key)
        if data:
            return Response(data)

        # 🚀 Query mínima y altamente optimizada
        empresas = (
            usuario.empresas_que_sigue
            .annotate(
                total_seguidores_annotated=Count("seguidores", distinct=True),
                is_following_annotated=Exists(
                    usuario.empresas_que_sigue.filter(pk=OuterRef("pk"))
                ),
            )
            .only("id", "nombre", "logo")  # ⚡ solo los campos necesarios
            .order_by("-id")
        )

        # 🔹 Serializador liviano solo con los campos esenciales
        data = {
            "empresas": [
                {
                    "id": e.id,
                    "nombre": e.nombre,
                    "logo": e.logo or "",
                    "total_seguidores": getattr(e, "total_seguidores_annotated", 0),
                    "is_following": getattr(e, "is_following_annotated", False),
                }
                for e in empresas
            ]
        }

        cache.set(cache_key, data, timeout=60)
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="total-empresas-seguidas")
    def total_empresas_seguidas(self, request, pk=None):
        usuario = self.get_object()
        return Response({
            "total": usuario.total_empresas_seguidas
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="upload-avatar")
    def upload_avatar(self, request, pk=None):
        usuario = self.get_object()
        file = request.FILES.get("file")  # ✅ usar FILES

        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        if not validate_image_with_sightengine(file):
            return Response({"error": "La imagen no pasó la validación de contenido."},
                            status=status.HTTP_400_BAD_REQUEST)

        file.seek(0)

        # Si ya tiene avatar, eliminarlo antes
        if usuario.avatar_path:
            delete_user_profile_picture(usuario.avatar_path)

        # Subir nueva imagen
        result = upload_user_profile_picture(file, usuario.id)

        # Guardar relación
        usuario.avatar_url = result["public_url"]
        usuario.avatar_path = result["path"]
        usuario.save()

        return Response(
            {
                "avatar_url": usuario.avatar_url,
                "avatar_path": usuario.avatar_path
            },
            status=status.HTTP_200_OK
        )


class FinalizeRegisterView(APIView):
    def post(self, request):
        data = request.data
        email = data.get('email')
        code = data.get('code')
        
        
        # Verifica que el correo esté verificado
        try:
            verification = EmailVerification.objects.get(email=email, is_verified=True)
        except EmailVerification.DoesNotExist:
            return Response({'error': 'Correo no verificado.'}, status=status.HTTP_400_BAD_REQUEST)
        # Crea el usuario si no existe
       #if Usuario.objects.filter(email=email).exists():
        #    return Response({'error': 'El usuario ya existe.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = RegisterSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Elimina el registro de verificación de email
        EmailVerification.objects.filter(email=email, is_verified=True).delete()
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Usuario creado exitosamente.',
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'phone': user.phone,
                'birthday': str(user.birthday),
                'region': user.region,
                'gender': user.gender
            },
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED,)

class PasswordResetRequestView(APIView):
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data['email']
        if not Usuario.objects.filter(email=email).exists() and not Empresa.objects.filter(email=email).exists():
            return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        
        code = str(random.randint(100000, 999999))
        expires_at = timezone.now() + timezone.timedelta(minutes=10)
        EmailVerification.objects.update_or_create(
            email=email,
            purpose="reset",
            defaults={
                "code": code,
                "expires_at": expires_at,
                "is_verified": False,
            }
        )
        send_mail(
            subject='Código de recuperación de contraseña',
            message=f'Tu código de recuperación es: {code}',
            from_email=None,  # Usa el DEFAULT_FROM_EMAIL de settings.py
            recipient_list=[email],
            fail_silently=False,
        )
        return Response({'message': 'Código enviado al correo.'}, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        password = serializer.validated_data['password']

        try:
            verification = EmailVerification.objects.get(
                email=email, code=code, purpose="reset", is_verified=False
            )
        except EmailVerification.DoesNotExist:
            return Response({'error': 'Código inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if verification.expires_at < timezone.now():
            return Response({'error': 'El código ha expirado.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            try:
                user = Empresa.objects.get(email=email)
            except Empresa.DoesNotExist:
                return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


        user.set_password(password)
        user.save()
        verification.is_verified = True
        verification.save()
        return Response({'message': 'Contraseña cambiada correctamente.'}, status=status.HTTP_200_OK)

class NotificacionUsuarioListView(generics.ListAPIView):
    serializer_class = NotificacionUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NotificacionUsuario.objects.filter(usuario=self.request.user).order_by('-creada_en')