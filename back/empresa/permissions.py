from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Empresa
from django.contrib.auth import get_user_model
Usuario = get_user_model()

class IsEmpresaAuthenticated(BasePermission):
    """
    Permite si:
      - request.user (AuthEntity) es una Empresa, o
      - request.user (AuthEntity) es un Usuario con empresa asociada
    """
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if user is None:
            return False

        # Si es nuestro wrapper, tendrá .empresa
        empresa = getattr(user, "empresa", None)
        return bool(empresa)


class IsEmpresaOrUsuarioAuthenticated(BasePermission):
    """
    Permite acceso si el request.user es:
    - un Usuario autenticado (is_authenticated True)
    - o una Empresa autenticada por token
    """
    def has_permission(self, request, view):
        user = request.user

        # Caso Usuario
        if hasattr(user, "is_authenticated"):
            return bool(user.is_authenticated)

        # Caso Empresa
        if isinstance(user, Empresa):
            return True  # ya pasó el token

        return False

def _is_usuario_entity(user):
    # Si usas AuthEntity: user.kind == 'usuario'
    kind = getattr(user, 'kind', None)
    if kind == 'usuario':
        return True
    # Si viene una instancia real de Usuario:
    try:
        return isinstance(user, Usuario)
    except Exception:
        return False

class IsUsuarioOrReadOnly(BasePermission):
    """
    GET/HEAD -> AllowAny
    POST/PUT/DELETE -> only authenticated *usuario* (no empresa tokens)
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        return _is_usuario_entity(user)
