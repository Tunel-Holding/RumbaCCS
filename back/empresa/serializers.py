from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Empresa

class EmpresaSerializer(serializers.ModelSerializer):
    total_seguidores = serializers.SerializerMethodField()
    is_siguiendo = serializers.SerializerMethodField()

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
            "eventos_publicados",
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


    def create(self, validated_data):
        user = self.context["request"].user
        return Empresa.objects.create(usuario=user, **validated_data)