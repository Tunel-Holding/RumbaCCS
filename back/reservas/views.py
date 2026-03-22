from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Reserva
from .serializers import ReservaSerializer, ReservaCreateSerializer

class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return ReservaCreateSerializer
        return ReservaSerializer

    def get_queryset(self):
        # Los usuarios solo ven sus propias reservas
        # Las empresas solo ven las reservas de sus eventos
        user = self.request.user
        
        # Asumiendo que request.user puede ser Usuario o Empresa
        # Si es Empresa (tiene empresaId segun la lógica del frontend/backend anterior)
        if hasattr(user, 'rif'): # Es una Empresa según modelos previos
            return Reserva.objects.filter(evento__empresa=user)
        
        # Si es un Usuario normal
        return Reserva.objects.filter(usuario=user)

    def perform_create(self, serializer):
        # Asignar el usuario logueado a la reserva
        serializer.save(usuario=self.request.user)
