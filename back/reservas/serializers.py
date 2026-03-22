from rest_framework import serializers
from .models import Reserva
from empresa.serializers import EventoSerializer

class ReservaSerializer(serializers.ModelSerializer):
    evento_detalles = EventoSerializer(source='evento', read_only=True)
    
    class Meta:
        model = Reserva
        fields = ['id', 'usuario', 'evento', 'evento_detalles', 'codigo_qr', 'status', 'cantidad', 'fecha_reserva']
        read_only_fields = ['codigo_qr', 'status', 'fecha_reserva']

class ReservaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = ['evento', 'cantidad']

    def create(self, validated_data):
        # El usuario se asigna desde el request.user en la vista
        return super().create(validated_data)
