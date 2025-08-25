from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import EmailVerification

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
            'gender': self.user.gender
        }
        if hasattr(self.user, "empresa"):
            data['empresa_id'] = self.user.empresa.id
        return data



class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'phone', 'birthday', 'region', 'gender',
            'is_staff', 'is_active'
        ]

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

    # def validate_email(self, value):
    #     try:
    #         verification = EmailVerification.objects.get(email=value)
    #     except EmailVerification.DoesNotExist:
    #         raise serializers.ValidationError("Este correo no ha sido verificado.")
    #     if not verification.is_verified:
    #         raise serializers.ValidationError("Debes verificar tu correo antes de registrarte.")
    #     return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Usuario.objects.create_user(password=password, **validated_data)
        return user

