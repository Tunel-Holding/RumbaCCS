from rest_framework import serializers
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Empresa, Evento2

class EventoSerializer(serializers.ModelSerializer):
    categoria = serializers.ListField(
        child=serializers.ChoiceField(choices=Evento2.CATEGORIA_CHOICES),
        allow_empty=False,
        help_text="Lista de categorías válidas"
    )
    
    empresa = serializers.PrimaryKeyRelatedField(read_only=True)
    edad_minima = serializers.IntegerField()
    capacidad = serializers.IntegerField()
    precio = serializers.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = Evento2
        fields = [
            "id",
            "titulo",
            "descripcion",
            "categoria",
            "codigo_vestimenta",
            "empresa",
            "descripcion_vestimenta",
            "edad_minima",
            "ubicacion",
            "capacidad",
            "precio",
            "moneda",
            "imagen",
            "creado_en",
            "actualizado_en",
        ]
        

    def validate(self, attrs):
        # validaciones extra (capacidad, precio…)
        for field in ['edad_minima', 'capacidad', 'precio']:
            value = attrs.get(field)
            print(f'{field} -> valor: {value!r}, tipo: {type(value)}')
            
        return super().validate(attrs)

    def create(self, validated_data):
        empresa = self.context["request"].user.empresa
        return Evento2.objects.create(empresa=empresa, **validated_data)
class EmpresaSerializer(serializers.ModelSerializer):
    
    total_seguidores = serializers.SerializerMethodField()
    is_siguiendo = serializers.SerializerMethodField()
    
    eventos = EventoSerializer(many=True, read_only=True)

    class Meta:
        model = Empresa
        fields = [
            "id",
            "nombre",
            "rif",               # Nuevo campo requerido y único
            "descripcion",
            "lugar",             # Sustituye a 'direccion'
            "telefono",
            "email_contacto",
            "redes_sociales",
            "logo",
            "total_seguidores",
            "eventos",
            "is_siguiendo",
            "fecha_creacion",
            "activo"
        ]
        read_only_fields = [
            "id",
            "total_seguidores",
            "is_siguiendo",
            "fecha_creacion",
            "activo"
        ]

    def get_total_seguidores(self, obj):
        return obj.seguidores.count()

    def get_is_siguiendo(self, obj):
        user = self.context["request"].user
        if user.is_authenticated:
            return obj.seguidores.filter(id=user.id).exists()
        return False

    def validate(self, attrs):
        user = self.context["request"].user
        if self.instance is None and hasattr(user, "empresa"):
            raise ValidationError("Ya tienes una empresa registrada con este usuario.")
        return attrs


