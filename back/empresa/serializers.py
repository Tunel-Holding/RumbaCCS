from .models import Empresa, Evento2, Rating, EmpresaEvento, EventoImagen, UsuarioEvento, EmpresaRedSocial
# Serializer para eventos guardados por usuario

from rest_framework import serializers
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import Avg, Count
from .models import Empresa, Evento2, Rating, EmpresaEvento, EventoImagen
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
        
def _normalize_url(url: str) -> str:
    """Normaliza una URL: si no tiene esquema, antepone https://"""
    if not url:
        return url
    url = url.strip()
    if not url:
        return url
    lower = url.lower()
    if lower.startswith('http://') or lower.startswith('https://'):
        return url
    return 'https://' + url

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
    empresa_redes = serializers.SerializerMethodField()
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
            "empresa_redes",
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
    
    def get_empresa_redes(self, obj):
        try:
            empresa = getattr(obj, 'empresa', None)
            if not empresa:
                return []
            return [{'tipo': r.tipo, 'url': r.url} for r in empresa.redes.all()]
        except Exception:
            return []
    

# Nuevo serializer para redes sociales
class EmpresaRedSocialSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmpresaRedSocial
        fields = ['tipo', 'url']

class EmpresaStaffSerializer(serializers.ModelSerializer):
    assigned_to = serializers.StringRelatedField(read_only=True)
    verified_by = serializers.StringRelatedField(read_only=True)

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
            "email",
            "logo",
            "fecha_creacion",
            "activo",
            # 🔹 Campos de asignación y verificación
            "status",
            "review_status",
            "assigned_to",
            "assigned_at",
            "company_verified",
            "verified_by",
            "verified_at",
            "verification_notes",
            "rejection_reason",
        ]
        read_only_fields = [
            "id",
            "assigned_to",
            "assigned_at",
            "verified_by",
            "verified_at",
            "fecha_creacion",
        ]

class EmpresaSerializer(serializers.ModelSerializer):
    total_seguidores = serializers.SerializerMethodField()
    is_siguiendo = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=True)
    avg_rating = serializers.SerializerMethodField(read_only=True)
    rating_count = serializers.SerializerMethodField(read_only=True)
    eventos = EventoSerializer(many=True, read_only=True)
    redes_sociales = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    total_eventos = serializers.SerializerMethodField()

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
            "email",
            "password",
            "redes_sociales",
            "logo",
            "total_seguidores",
            "is_siguiendo",
            "fecha_creacion",
            "activo",
            "avg_rating",
            "rating_count",
            "total_eventos",
            "is_following",
            "status",
            "rejection_reason",
            "verification_notes",
            "eventos",
            
        ]
        read_only_fields = [
            "id",
            "total_seguidores",
            "is_siguiendo",
            "fecha_creacion",
            "activo",
            "status",
            "rejection_reason",
            "verification_notes",
        ]

    def get_is_following(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return False

        if getattr(user, "kind", None) != "usuario":
            return False

        usuario = user.obj
        return obj.seguidores.filter(id=usuario.id).exists()
    
    def get_total_seguidores(self, obj):
        return obj.seguidores.count()

    def get_total_eventos(self, obj):
        return obj.eventos.count()
    
    def get_is_siguiendo(self, obj):
        auth_entity = self.context["request"].user
        if not auth_entity or not auth_entity.is_authenticated:
            return False

        if getattr(auth_entity, "kind", None) != "usuario":
            return False  # solo usuarios pueden seguir empresas

        usuario = auth_entity.obj
        return obj.seguidores.filter(id=usuario.id).exists()


    def get_avg_rating(self, obj):
        agg = obj.ratings.aggregate(avg=Avg('rating'))
        avg = agg.get('avg') or 0
        return round(avg, 2)

    def get_rating_count(self, obj):
        agg = obj.ratings.aggregate(count=Count('id'))
        return agg.get('count') or 0

    def get_redes_sociales(self, obj):
        # Devuelve una lista de objetos con tipo y url para que el frontend pueda
        # renderizar hipervínculos fácilmente.
        return [{'tipo': r.tipo, 'url': r.url} for r in obj.redes.all()]
    
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
    # Aceptamos una lista que puede contener strings (urls) o dicts {"tipo":..., "url":...}
    redes_sociales = serializers.ListField(child=serializers.JSONField(), write_only=True, required=False)
    

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
        ]

    def create(self, validated_data):

        redes = validated_data.pop('redes_sociales', [])
        empresa = Empresa.objects.create(**validated_data)

        url_validator = URLValidator()
        for red in redes:
            tipo = 'instagram'
            url = ''
            if isinstance(red, str):
                url = red
            elif isinstance(red, dict):
                tipo = red.get('tipo', 'instagram')
                url = red.get('url', '')

            # normalizar antes de validar
            url = _normalize_url(url)

            # validar url antes de crear
            if not url:
                continue
            try:
                url_validator(url)
            except DjangoValidationError:
                # ignoramos entradas inválidas; podríamos recolectarlas y devolver errores si se prefiere
                continue

            EmpresaRedSocial.objects.create(empresa=empresa, url=url, tipo=tipo)

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
    redes_sociales = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    total_seguidores = serializers.SerializerMethodField()
    total_eventos = serializers.SerializerMethodField()
    

    class Meta:
        model = Empresa
        fields = [
            "id",
            "nombre",
            "descripcion",
            "logo",
            "rif",
            "redes_sociales",
            "lugar",
            "telefono",
            "email_contacto",
            "is_following",
            "total_seguidores",
            "total_eventos",
        ]

    def get_is_following(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return False

        # Caso AuthEntity (tienes .kind y .obj)
        if getattr(user, "kind", None) == "usuario" and hasattr(user, "obj"):
            usuario = user.obj
            return obj.seguidores.filter(id=usuario.id).exists()

        # Caso que sea directamente un Usuario (por si acaso)
        from .models import Usuario
        try:
            if isinstance(user, Usuario):
                return obj.seguidores.filter(id=user.id).exists()
        except Exception:
            pass

        return False
    def get_total_seguidores(self, obj):
        return obj.seguidores.count()
    def get_total_eventos(self, obj):
        return obj.eventos.count()

    def get_redes_sociales(self, obj):
        try:
            return [{'tipo': r.tipo, 'url': r.url} for r in obj.redes.all()]
        except Exception:
            return []

class EventoPublicSerializer(serializers.ModelSerializer):
    imagenes = EventoImagenSerializer(many=True, read_only=True)
    empresa_redes = serializers.SerializerMethodField()
    
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
            "imagenes",
            "empresa_redes",
            "fecha_evento",
        ]

    def get_empresa_redes(self, obj):
        try:
            empresa = getattr(obj, 'empresa', None)
            if not empresa:
                return []
            return [{'tipo': r.tipo, 'url': r.url} for r in empresa.redes.all()]
        except Exception:
            return []

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

        # Verificar que la empresa (si se proporcionó) esté verificada.
        empresa = validated_data.get('empresa')
        if empresa is not None and not getattr(empresa, 'company_verified', False):
            raise ValidationError({"detail": "Empresa no verificada. No puede crear eventos hasta ser verificada."})

        # 1️⃣ Crear el Evento2
        # Si la columna 'promote' existe en la base de datos pero no está
        # definida en el modelo (esquema fuera de sincronía), pasar un valor
        # por defecto evita IntegrityError por NOT NULL.
        if 'promote' not in evento_data:
            evento_data['promote'] = False

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


class EmpresaBulkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = ['id', 'nombre', 'logo']
