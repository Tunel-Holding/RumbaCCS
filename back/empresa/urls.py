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
    EmpresaLoginView,
    EmpresaReenviarPinView,
    EmpresaPublicDetailView,
    EmpresaPublicEventosView,
    EmpresaRatingsListCreateView,
    RatingDetailView,
    EmpresaEventoCreateView,
    EventoImagenViewSet,
    empresas_por_ids,
    UsuarioEventoViewSet,
    EmpresaValidarPinConUsuarioView,
    UsuarioComentariosView,
)

# 1) Router principal para empresas
router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet, basename='empresa')

# 2) Router anidado para eventos de cada empresa
empresas_router = NestedDefaultRouter(router, r'empresas', lookup='empresa')
empresas_router.register(r'eventos', EventoViewSet, basename='empresa-eventos')

# 3) Eventos públicos
router.register(r'eventos-publicos', EventosPublicosViewSet, basename='eventos-publicos')

# 5) Eventos guardados por usuario
router.register(r'eventos-guardados', UsuarioEventoViewSet, basename='eventos-guardados')

# 4) Imágenes de eventos
eventos_router = NestedDefaultRouter(empresas_router, r'eventos', lookup='evento')
eventos_router.register(r'imagenes', EventoImagenViewSet, basename='evento-imagenes')

evento_imagenes = EventoImagenViewSet.as_view({'post': 'create'})

urlpatterns = [
    # Rutas base: /api/empresas/ y /api/empresas/<pk>/
    path('', include(router.urls)),

    # Rutas anidadas: /api/empresas/<empresa_pk>/eventos/
    path('', include(empresas_router.urls)),
    
    path('', include(eventos_router.urls)),

    # Endpoint detalle y mi empresa
    path('mi-empresa/', mi_empresa, name='mi-empresa'),
    path('empresa/<int:pk>/', empresa_detail, name='empresa-detail'),
    path("public/empresas/<int:id>/", EmpresaPublicDetailView.as_view(), name="empresa-public-detail"),
    path("public/empresas/<int:id>/eventos/", EmpresaPublicEventosView.as_view(), name="empresa-public-eventos"),
    
    path("public/empresas/bulk/", empresas_por_ids, name="empresas_por_ids"),

    # Flujo B: Registro de empresa independiente
    path('registro-empresa/', EmpresaPreRegistroView.as_view(), name='registro-empresa'),
    path('validar-pin-empresa/', EmpresaValidarPinView.as_view(), name='validar-pin-empresa'),
    path('reenviar-pin-empresa/', EmpresaReenviarPinView.as_view(), name='reenviar-pin-empresa'),
    
    # Flujo C: Registro de empresa vinculada a usuario
    path('validar-pin-empresa-usuario/', EmpresaValidarPinConUsuarioView.as_view(), name='validar-pin-empresa-usuario'),

    # Login de empresa
    # path('login-empresa/', EmpresaLoginView.as_view(), name='login-empresa'),
    path("empresa/login/", EmpresaLoginView.as_view(), name="empresa_token_obtain_pair"),
    
    #Calificaciones
    path('empresas/<int:empresa_pk>/ratings/', EmpresaRatingsListCreateView.as_view(), name='empresa-ratings'),
    path('ratings/<int:pk>/', RatingDetailView.as_view(), name='rating-detail'),
    path('usuario/comentarios/', UsuarioComentariosView.as_view(), name='usuario-comentarios'),

    # Crear evento para una empresa
    path('empresa_evento/', EmpresaEventoCreateView.as_view(), name='empresa_evento-create'),
    
    # Imagenes de eventos
    path('api/eventos/<int:evento_id>/imagenes/', evento_imagenes, name='evento-imagenes'),
    
    
]
