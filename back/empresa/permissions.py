from rest_framework import permissions

class IsEmpresaUser(permissions.BasePermission):
    """
    Solo usuarios con perfil Empresa autenticados pueden CRUD sobre eventos.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, "empresa")
        )
