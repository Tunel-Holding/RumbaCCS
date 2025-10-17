from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificacionUsuarioListView, UsuarioViewSet, RegistroUsuarioView, SendVerificationCodeView, VerifyCodeView, FinalizeRegisterView, UnifiedLoginView
from rest_framework_simplejwt.views import TokenRefreshView
from .views import SafeTokenRefreshView  # Importa tu nueva vista personalizada
from .views import PasswordResetRequestView, PasswordResetConfirmView  # Asegúrate de importar las vistas


router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', UnifiedLoginView.as_view(), name='login-unificado'),  # LOGIN unificado
    path('token/refresh/', SafeTokenRefreshView.as_view(), name='token_refresh'),   # Refrescar token
    path('register/', RegistroUsuarioView.as_view(), name='registro'),          # Registro de usuario
    path('send-verification-code/', SendVerificationCodeView.as_view(), name='send-verification-code'),
    path('verify-code/', VerifyCodeView.as_view(), name='verify-code'),
    path('finalize-register/', FinalizeRegisterView.as_view(), name='finalize-register'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    # Rutas para notificaciones de usuario
     path('notificaciones/', NotificacionUsuarioListView.as_view(), name='notificaciones-usuario'),
]
