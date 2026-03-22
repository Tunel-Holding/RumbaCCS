from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReservaViewSet

router = DefaultRouter()
router.register(r'', ReservaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
