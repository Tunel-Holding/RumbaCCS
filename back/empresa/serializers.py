from rest_framework import serializers
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError
from .models import Empresa, Evento2, Usuario
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

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
    fecha_evento = serializers.DateTimeField(required=True,read_only = False)

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
            "fecha_evento",
            "creado_en",
            "actualizado_en",
        ]

    def validate(self, attrs):
        # Validaciones extra
        for field in ['edad_minima', 'capacidad', 'precio']:
            value = attrs.get(field)
            print(f'{field} -> valor: {value!r}, tipo: {type(value)}')
        return super().validate(attrs)
    
class EmpresaSerializer(serializers.ModelSerializer):
    
    total_seguidores = serializers.SerializerMethodField()
    is_siguiendo = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=True)
    
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
            "email",
            "password",
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

    # def validate(self, attrs):
    #     user = self.context["request"].user
    #     if self.instance is None:
    #         try:
    #             _ = user.empresa  # intenta acceder
    #             raise ValidationError("Ya tienes una empresa registrada con este usuario.")
    #         except Empresa.DoesNotExist:
    #             pass  # no tiene empresa → OK
    #     return attrs
    

class EmpresaRegistroSerializer(serializers.ModelSerializer):
    # Campos para crear el usuario
    # email = serializers.EmailField(write_only=True)
    # password = serializers.CharField(write_only=True)
    
    # phone = serializers.IntegerField(write_only=True)
    # birthday = serializers.DateField(required=False, allow_null=True)
    # region = serializers.ChoiceField(write_only=True, choices=Usuario.ESTADO_CHOICES)
    # gender = serializers.ChoiceField(write_only=True, choices=Usuario.GENERO_CHOICES)

    class Meta:
        model = Empresa
        fields = [
            "id",
            "nombre",
            "rif",
            "descripcion",
            "lugar",
            "telefono",
            "email_contacto",
            "redes_sociales",
            "logo",
            "email",      
            "password",   
            # "phone",      # para user
            # "birthday",   # para user
            # "region",     # para user
            # "gender"      # para user
        ]

    def create(self, validated_data):
        empresa = Empresa.objects.create(**validated_data)

        return empresa



class EmpresaTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, empresa: Empresa):
        token = RefreshToken.for_user(empresa)
        # 👇 añadimos campos personalizados
        token["empresa_id"] = empresa.id
        token["email"] = empresa.email
        return token

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        try:
            empresa = Empresa.objects.get(email=email)
        except Empresa.DoesNotExist:
            raise serializers.ValidationError("Empresa no encontrada.")

        if not empresa.check_password(password):
            raise serializers.ValidationError("Contraseña incorrecta.")

        refresh = self.get_token(empresa)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "empresa": {
                "id": empresa.id,
                "nombre": empresa.nombre,
                "email": empresa.email,
            }
        }