from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from empresa.models import Empresa
from empresa.serializers import EmpresaSerializer
from .models import EmailVerification, NotificacionUsuario

Usuario = get_user_model()

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Agregar campos personalizados al payload
        if hasattr(user, "empresa"):
            token["empresa_id"] = user.empresa.id

        token["username"] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'username': self.user.username,
            'phone': self.user.phone,
            'birthday': str(self.user.birthday),
            'region': self.user.region,
            'gender': self.user.gender,
            'avatar_url': self.user.avatar_url,
        }
        if hasattr(self.user, "empresa"):
            data['empresa_id'] = self.user.empresa.id
        return data

class LoginUnificadoSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        request = self.context.get("request")
        email = attrs.get("email")
        password = attrs.get("password")

        # Intentar login como Empresa
        try:
            empresa = Empresa.objects.get(email=email)
            if empresa.check_password(password):
                self.user = empresa
                refresh = self.get_token(empresa)
                empresa_data = EmpresaSerializer(empresa, context={"request": request}).data
                return {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "tipo": "empresa",
                    "empresa": empresa_data
                }
        except Empresa.DoesNotExist:
            pass

        # Intentar login como Usuario
        try:
            usuario = Usuario.objects.get(email=email)
            if usuario.check_password(password):
                self.user = usuario
                refresh = self.get_token(usuario)
                return {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "tipo": "usuario",
                    "user": {
                        "id": usuario.id,
                        "email": usuario.email,
                        "username": usuario.username,
                        "phone": usuario.phone,
                        "birthday": str(usuario.birthday),
                        "region": usuario.region,
                        "gender": usuario.gender,
                        "avatar_url": usuario.avatar_url,
                    }
                }
        except Usuario.DoesNotExist:
            pass

        raise serializers.ValidationError("Credenciales inválidas.")

    @classmethod
    def get_token(cls, user):
        token = RefreshToken.for_user(user)
        token["email"] = user.email
        token["username"] = getattr(user, "username", None)
        token["is_empresa"] = hasattr(user, "nombre")  # o isinstance(user, Empresa)
        if hasattr(user, "id"):
            token["id"] = user.id
        return token

class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'phone', 'birthday', 'region', 'gender',
            'is_staff', 'is_active', 'avatar_url'
        ]
    
    @property
    def total_empresas_seguidas(self):
        return self.empresas_que_sigue.count()

class RegisterSerializer(serializers.ModelSerializer):
    
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=Usuario.objects.all(), message="Este email ya está registrado.")]
    )
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ['email', 'username', 'password', 'phone', 'birthday', 'region', 'gender']

    def validate_phone(self, value):
        # Asegura 10 dígitos. Si vas a permitir otros formatos, cámbialo a CharField en el modelo.
        if not (1000000000 <= int(value) <= 9999999999):
            raise serializers.ValidationError("El teléfono debe tener 10 dígitos.")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Usuario.objects.create_user(password=password, **validated_data)
        return user

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Las contraseñas no coinciden.")
        return data
    
class NotificacionUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificacionUsuario
        fields = ['id', 'mensaje', 'tipo', 'leida', 'creada_en']