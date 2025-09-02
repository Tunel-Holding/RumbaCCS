from rest_framework.permissions import BasePermission
from .models import Empresa

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