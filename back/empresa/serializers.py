from rest_framework import serializers
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError
from .models import Empresa, Evento2, Usuario

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

class EmpresaRegistroSerializer(serializers.ModelSerializer):
    # Campos para crear el usuario
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    
    phone = serializers.IntegerField(write_only=True)
    birthday = serializers.DateField(required=False, allow_null=True)
    region = serializers.ChoiceField(write_only=True, choices=Usuario.ESTADO_CHOICES)
    gender = serializers.ChoiceField(write_only=True, choices=Usuario.GENERO_CHOICES)

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
            "email",      # para user
            "password",   # para user
            "phone",      # para user
            "birthday",   # para user
            "region",     # para user
            "gender"      # para user
        ]

    def create(self, validated_data):
        # Extraer campos del usuario
        email = validated_data.pop("email")
        password = validated_data.pop("password")
        phone = validated_data.pop("phone", None)
        birthday = validated_data.pop("birthday", None)
        region = validated_data.pop("region", None)
        gender = validated_data.pop("gender", None)

        nombre_empresa = validated_data.get("nombre")  # usar nombre de empresa como username

        # Crear usuario
        try:
            usuario = Usuario.objects.create_user(
                email=email,
                password=password,
                username=nombre_empresa,
                phone=phone,
                birthday=birthday,
                region=region,
                gender=gender
            )
        except IntegrityError:
            raise ValidationError({"usuario": "El correo ya está en uso o el nombre de empresa ya está registrado"})

        # Crear empresa asociada
        empresa = Empresa.objects.create(usuario=usuario, **validated_data)

        return empresa

# class EmpresaRegistroSerializer(serializers.ModelSerializer):
#     # Campos usuario
#     email = serializers.EmailField(write_only=True)
#     password = serializers.CharField(write_only=True)
    
#     phone = serializers.CharField(write_only=True)
#     birthday = serializers.DateField(write_only=True)
#     region = serializers.ChoiceField(write_only=True, choices=Usuario.ESTADO_CHOICES)
#     gender = serializers.ChoiceField(write_only=True, choices=Usuario.GENERO_CHOICES)

#     class Meta:
#         model = Empresa
#         fields = [
#             "nombre",
#             "rif",
#             "descripcion",
#             "lugar",
#             "telefono",        # teléfono de la empresa (opcional)
#             "email_contacto",
#             "redes_sociales",
#             "logo",
#             "email",
#             "password",
#             "username",
#             "phone",
#             "birthday",
#             "region",
#             "gender",
#         ]

#     def create(self, validated_data):
#         email = validated_data.pop("email")
#         password = validated_data.pop("password")
#         nombre_empresa = validated_data.pop("nombre")
#         phone = validated_data.pop("phone")
#         birthday = validated_data.pop("birthday")
#         region = validated_data.pop("region")
#         gender = validated_data.pop("gender")
        
#         # 🔹 Si ya existe un usuario logueado, usarlo
#         request = self.context.get("request")
#         if request and request.user.is_authenticated:
#             usuario = request.user
#             # Solo actualizar el phone si no tiene
#             if not usuario.phone:
#                 usuario.phone = phone
#                 usuario.save()
#         else:
#             # Crear nuevo usuario
#             usuario = Usuario.objects.create_user(
#                 email=email,
#                 password=password,
#                 username=nombre_empresa,
#                 phone=phone,
#                 birthday=birthday,
#                 region=region,
#                 gender=gender
#             )

#         # Crear empresa, usar telefono de empresa si viene del form
#         empresa_telefono = validated_data.pop("telefono", phone)  # si no hay telefono, usamos phone
#         empresa = Empresa.objects.create(
#             usuario=usuario,
#             nombre=nombre_empresa,
#             telefono=empresa_telefono,
#             **validated_data
#         )
#         return empresa
