from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from empresa.models import Empresa

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
