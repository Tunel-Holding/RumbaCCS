from .models import Empresa, Evento2, Rating, EmpresaEvento, EventoImagen, UsuarioEvento
# Serializer para eventos guardados por usuario

from rest_framework import serializers
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import Avg, Count
from .models import Empresa, Evento2, Rating, EmpresaEvento, EventoImagen
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

class EventoImagenSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoImagen
        fields = ["id", "url", "creada_en"]

class TempImageSerializer(serializers.Serializer):
    url = serializers.URLField()
    
class EventoSerializer(serializers.ModelSerializer):
    categoria = serializers.ListField(
        child=serializers.ChoiceField(choices=Evento2.CATEGORIA_CHOICES),
        allow_empty=False,
        help_text="Lista de categorías válidas"
    )
    imagenes = EventoImagenSerializer(many=True, read_only=True)
    empresa = serializers.PrimaryKeyRelatedField(read_only=True)
    edad_minima = serializers.IntegerField()
    capacidad = serializers.IntegerField()
    precio = serializers.DecimalField(max_digits=10, decimal_places=2)
    fecha_evento = serializers.DateTimeField(required=True,read_only = False)
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

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
            "imagenes",
            "fecha_evento",
            "creado_en",
            "actualizado_en",
            "latitude",
            "longitude",
        ]

    def get_distance(self, obj):
        # Si la queryset anotó 'distance', lo muestra; si no, null
        return getattr(obj, 'distance', None)

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
    avg_rating = serializers.SerializerMethodField(read_only=True)
    rating_count = serializers.SerializerMethodField(read_only=True)
    
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
            "activo",
            "avg_rating",
            "rating_count",
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

    def get_avg_rating(self, obj):
        agg = obj.ratings.aggregate(avg=Avg('rating'))
        avg = agg.get('avg') or 0
        return round(avg, 2)

    def get_rating_count(self, obj):
        agg = obj.ratings.aggregate(count=Count('id'))
        return agg.get('count') or 0
    
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
        
        
class EmpresaPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        # 🔓 Solo los campos visibles públicamente
        fields = [
            "id",
            "nombre",
            "descripcion",
            "logo",
            "rif",
            "lugar",
            "telefono",
            "email_contacto",
        ]
        

class EventoPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evento2
        fields = [
            "id",
            "titulo",
            "descripcion",
            "categoria",
            "codigo_vestimenta",
            "edad_minima",
            "ubicacion",
            "capacidad",
            "precio",
            "moneda",
            "imagen",
            "fecha_evento",
        ]

class RatingSerializer(serializers.ModelSerializer):
    usuario = serializers.PrimaryKeyRelatedField(read_only=True)  # se asigna desde la vista
    usuario_username = serializers.SerializerMethodField(source='usuario.username', read_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'empresa', 'usuario', 'usuario_username', 'rating', 'comentario', 'creado_en', 'actualizado_en']
        read_only_fields = ['id', 'usuario', 'creado_en', 'actualizado_en', 'usuario_username']

    def get_usuario_username(self, obj):
        # devuelve nombre/email para mostrar en listados
        try:
            return getattr(obj.usuario, 'username', getattr(obj.usuario, 'email', None))
        except:
            return None

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("El rating debe estar entre 1 y 5")
        return value

class EmpresaEventoSerializer(serializers.ModelSerializer):
    # Lista de URLs temporales que vienen del front
    imagenesTemp = serializers.ListField(
        child=serializers.URLField(),
        write_only=True,
        required=False,
        help_text="URLs de imágenes temporales a asignar al evento"
    )

    # Datos para crear el evento
    evento_data = serializers.DictField(write_only=True)

    class Meta:
        model = EmpresaEvento
        fields = ['id', 'empresa', 'evento_data', 'fecha_reserva', 'imagenesTemp']

    def create(self, validated_data):
        imagenes_temp = validated_data.pop("imagenesTemp", [])
        evento_data = validated_data.pop("evento_data")

        # 1️⃣ Crear el Evento2
        evento = Evento2.objects.create(**evento_data)

        # 2️⃣ Reasignar las imágenes temporales al evento
        for url in imagenes_temp:
            EventoImagen.objects.create(evento=evento, url=url)

        # 3️⃣ Crear el registro EmpresaEvento
        empresa_evento = EmpresaEvento.objects.create(
            evento=evento,
            empresa=validated_data.get("empresa")
        )

        return empresa_evento
    
class UsuarioEventoSerializer(serializers.ModelSerializer):
    evento = serializers.PrimaryKeyRelatedField(queryset=Evento2.objects.all(), write_only=True)
    evento_obj = EventoSerializer(source='evento', read_only=True)
    class Meta:
        model = UsuarioEvento
        fields = ['id', 'evento', 'evento_obj', 'fecha_guardado']