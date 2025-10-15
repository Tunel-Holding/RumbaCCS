from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, RegistroUsuarioView, SendVerificationCodeView, VerifyCodeView, FinalizeRegisterView
from rest_framework_simplejwt.views import TokenRefreshView
from .views import MyTokenObtainPairView  # Importa tu nueva vista personalizada
from .views import PasswordResetRequestView, PasswordResetConfirmView  # Asegúrate de importar las vistas
from rest_framework import serializers

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Las contraseñas no coinciden.")
        return data

urlpatterns = [
    path('', include(router.urls)),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),  # LOGIN con email
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),   # Refrescar token
    path('register/', RegistroUsuarioView.as_view(), name='registro'),          # Registro de usuario
    path('send-verification-code/', SendVerificationCodeView.as_view(), name='send-verification-code'),
    path('verify-code/', VerifyCodeView.as_view(), name='verify-code'),
    path('finalize-register/', FinalizeRegisterView.as_view(), name='finalize-register'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
