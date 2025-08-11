from django.shortcuts import render
from rest_framework import viewsets, permissions, generics, permissions, status
from django.contrib.auth import get_user_model, authenticate
from .serializers import UsuarioSerializer
from .serializers import RegistroUsuarioSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

Usuario = get_user_model()

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

# Serializer personalizado que permite login con email en vez de username
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Aquí reemplazamos el campo 'username' por 'email' para que funcione con email
        attrs['username'] = attrs.get('email') or attrs.get('username')
        return super().validate(attrs)

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.AllowAny]  # Cambia según tu seguridad


class RegistroUsuarioView(generics.CreateAPIView):
    serializer_class = RegistroUsuarioSerializer
    permission_classes = [permissions.AllowAny]
