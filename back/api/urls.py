from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, RegistroUsuarioView
from rest_framework_simplejwt.views import TokenRefreshView
from .views import MyTokenObtainPairView  # Importa tu nueva vista personalizada

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),  # LOGIN con email
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),   # Refrescar token
    path('register/', RegistroUsuarioView.as_view(), name='registro'),          # Registro de usuario
]



# Rutas de ViewSets
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)

urlpatterns = [
    path('', include(router.urls)),

    # LOGIN con email y datos de usuario
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),

    # Refrescar token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Registro de usuario con retorno de token + datos
    path('register/', RegistroUsuarioView.as_view(), name='registro'),
]
