# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from .views import EmpresaViewSet, EventoViewSet, mi_empresa
# from . import views

# router = DefaultRouter()
# router.register(r'empresas', EmpresaViewSet, basename='empresa')
# router.register(r'eventos', EventoViewSet, basename='evento')

# urlpatterns = [
#     path('', include(router.urls)),
#     path("empresa/<int:pk>/", views.empresa_detail),
#     path('mi-empresa/', mi_empresa),
# ]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import EmpresaViewSet, EventoViewSet, mi_empresa, empresa_detail, EventosPublicosViewSet, EmpresaPreRegistroView, EmpresaValidarPinView

# 1) Router principal para empresas
router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet, basename='empresa')

# 2) Router anidado para eventos de cada empresa
empresas_router = NestedDefaultRouter(router, r'empresas', lookup='empresa')
empresas_router.register(r'eventos', EventoViewSet, basename='empresa-eventos')


router.register(r'eventos-publicos', EventosPublicosViewSet, basename='eventos-publicos')

urlpatterns = [
  # Rutas base: /api/empresas/ y /api/empresas/<pk>/
  path('', include(router.urls)),

  # Rutas anidadas: /api/empresas/<empresa_pk>/eventos/
  path('', include(empresas_router.urls)),

  # Otras rutas de tu app
  path('mi-empresa/', mi_empresa, name='mi-empresa'),
  
  # Registro de empresa (nuevo flujo)
  path('registro-empresa/', EmpresaPreRegistroView.as_view(), name='registro-empresa'),
  path('validar-pin-empresa/', EmpresaValidarPinView.as_view(), name='validar-pin-empresa'),
]