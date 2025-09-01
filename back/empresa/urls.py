from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import (
    EmpresaViewSet,
    EventoViewSet,
    mi_empresa,
    empresa_detail,
    EventosPublicosViewSet,
    EmpresaPreRegistroView,
    EmpresaValidarPinView,
    EmpresaTokenObtainPairView,
    EmpresaLoginView,  # <-- agregado
)

# 1) Router principal para empresas
router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet, basename='empresa')

# 2) Router anidado para eventos de cada empresa
empresas_router = NestedDefaultRouter(router, r'empresas', lookup='empresa')
empresas_router.register(r'eventos', EventoViewSet, basename='empresa-eventos')

# 3) Eventos públicos
router.register(r'eventos-publicos', EventosPublicosViewSet, basename='eventos-publicos')

urlpatterns = [
    # Rutas base: /api/empresas/ y /api/empresas/<pk>/
    path('', include(router.urls)),

    # Rutas anidadas: /api/empresas/<empresa_pk>/eventos/
    path('', include(empresas_router.urls)),

    # Endpoint detalle y mi empresa
    path('mi-empresa/', mi_empresa, name='mi-empresa'),
    path('empresa/<int:pk>/', empresa_detail, name='empresa-detail'),

    # Flujo B: Registro de empresa independiente
    path('registro-empresa/', EmpresaPreRegistroView.as_view(), name='registro-empresa'),
    path('validar-pin-empresa/', EmpresaValidarPinView.as_view(), name='validar-pin-empresa'),

    # Login de empresa
    # path('login-empresa/', EmpresaLoginView.as_view(), name='login-empresa'),
    path("empresa/login/", EmpresaLoginView.as_view(), name="empresa_token_obtain_pair"),
]
