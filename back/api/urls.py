from django.urls import path, include
from .views import UsuarioViewSet
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),       # Login
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),      # Refrescar token
]
