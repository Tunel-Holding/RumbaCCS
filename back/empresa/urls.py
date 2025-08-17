from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmpresaViewSet
from . import views

router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet, basename='empresa')

urlpatterns = [
    path('', include(router.urls)),
    path("empresa/<int:pk>/", views.empresa_detail),
    
]