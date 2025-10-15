import email
from django.shortcuts import render
from rest_framework import viewsets, permissions, generics, status
from django.contrib.auth import get_user_model, authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RegisterSerializer, UserPublicSerializer, MyTokenObtainPairSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
from .models import EmailVerification, Usuario
from django.core.mail import send_mail
from django.utils import timezone
import random
from django.conf import settings

Usuario = get_user_model()

class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserPublicSerializer

    def get_object(self):
        return self.request.user


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegistroUsuarioView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        data = request.data
        email = data.get('email')
        if not email:
            return Response({'error': 'Email requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        code = str(random.randint(100000, 999999))
        expires_at = timezone.now() + timezone.timedelta(minutes=10)
        # Si ya existe, actualiza el código y la expiración
        EmailVerification.objects.update_or_create(
            email=email,
            defaults={
                'code': code,
                'expires_at': expires_at,
                'is_verified': False
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
        if Usuario.objects.filter(email=email).exists():
            return Response({'error': 'El usuario ya existe.'}, status=status.HTTP_400_BAD_REQUEST)
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
        if not Usuario.objects.filter(email=email).exists():
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
            return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(password)
        user.save()
        verification.is_verified = True
        verification.save()
        return Response({'message': 'Contraseña cambiada correctamente.'}, status=status.HTTP_200_OK)

