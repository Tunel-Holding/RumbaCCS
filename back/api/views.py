from django.shortcuts import render
from rest_framework import viewsets, permissions, generics, status
from django.contrib.auth import get_user_model, authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RegisterSerializer, UserPublicSerializer, MyTokenObtainPairSerializer
from .models import EmailVerification
from django.core.mail import send_mail
from django.utils import timezone
import random

Usuario = get_user_model()
class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generar tokens al registrar
        refresh = RefreshToken.for_user(user)
        user_payload = UserPublicSerializer(user).data

        return Response({
            "message": "Usuario creado con éxito",
            "user": user_payload,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)

class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserPublicSerializer

    def get_object(self):
        return self.request.user


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    


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
        send_mail(
            'Tu código de verificación',
            f'Tu código es: {code}',
            'noreply@rumbaccs.com',
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
