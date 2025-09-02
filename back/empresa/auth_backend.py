from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from dataclasses import dataclass
from typing import Any
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt

from .models import Empresa, Usuario

User = get_user_model()

class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        # Caso empresa
        if validated_token.get("is_empresa"):
            empresa_id = validated_token.get("empresa_id")
            if empresa_id:
                try:
                    return Empresa.objects.get(id=int(empresa_id))
                except Empresa.DoesNotExist:
                    raise AuthenticationFailed(
                        {"detail": "Empresa not found", "code": "empresa_not_found"}
                    )

        # Caso usuario normal
        user_id = validated_token.get("user_id")
        if user_id:
            try:
                return User.objects.get(id=int(user_id))
            except User.DoesNotExist:
                raise AuthenticationFailed(
                    {"detail": "User not found", "code": "user_not_found"}
                )

        raise AuthenticationFailed(
            {"detail": "Invalid token: neither user nor empresa found", "code": "invalid_token"}
        )

class AuthEntity:
    """
    Wrapper que:
      - expone .is_authenticated (DRF lo necesita)
      - delega atributos al objeto real (Empresa o Usuario)
      - expone .empresa de forma uniforme:
          * si es Empresa: devuelve la propia empresa
          * si es Usuario: devuelve user.empresa (o None)
    """
    def __init__(self, kind: str, obj: Any):
        self.kind = kind               # "empresa" o "usuario"
        self.obj = obj                 # instancia real (Empresa o Usuario)

    @property
    def is_authenticated(self) -> bool:
        return True

    def __getattr__(self, name: str):
        # delega cualquier atributo no resuelto al objeto real
        return getattr(self.obj, name)

    @property
    def empresa(self):
        if self.kind == "empresa":
            return self.obj
        # usuario
        return getattr(self.obj, "empresa", None)


class EmpresaOrUsuarioJWTAuthentication(BaseAuthentication):
    """
    Lee el JWT y devuelve un AuthEntity:
      - AuthEntity("empresa", Empresa(...)) si viene empresa_id
      - AuthEntity("usuario", Usuario(...)) si viene user_id/usuario_id
    """
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except (jwt.ExpiredSignatureError, jwt.DecodeError):
            raise AuthenticationFailed("Token inválido o expirado")

        # Flujo EMPRESA
        empresa_id = payload.get("empresa_id")
        if empresa_id:
            try:
                empresa = Empresa.objects.get(id=empresa_id)
            except Empresa.DoesNotExist:
                raise AuthenticationFailed("Empresa no encontrada")
            return (AuthEntity("empresa", empresa), token)

        # Flujo USUARIO
        usuario_id = payload.get("usuario_id") or payload.get("user_id")
        if usuario_id:
            try:
                usuario = Usuario.objects.get(id=usuario_id)
            except Usuario.DoesNotExist:
                raise AuthenticationFailed("Usuario no encontrado")
            return (AuthEntity("usuario", usuario), token)

        raise AuthenticationFailed("Token inválido (sin empresa_id ni user_id)")
