from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

Usuario = get_user_model()



class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Agrega claims adicionales si quieres
        token['email'] = user.email
        return token

    def validate(self, attrs):
        # Cambiar de 'username' a 'email'
        attrs['username'] = attrs.get('email') or attrs.get('username')
        data = super().validate(attrs)
        user = self.user
        data['nombre'] = getattr(user, 'nombre', '')
        print('LOGIN RESPONSE:', data)  # Depuración: muestra la respuesta en consola
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'email', 'nombre']

class RegistroUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = ['email', 'nombre', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario
