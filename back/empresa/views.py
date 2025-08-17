from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Empresa
from .serializers import EmpresaSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from .models import Empresa

class EmpresaViewSet(ModelViewSet):
    serializer_class = EmpresaSerializer
    authentication_classes = [JWTAuthentication]  # evita exigir CSRF

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Si quieres devolver todas las empresas (para que un usuario pueda seguir cualquier empresa)
        return Empresa.objects.all()

    @action(detail=True, methods=['post'])
    def seguir(self, request, pk=None):
        empresa = self.get_object()
        empresa.seguidores.add(request.user)
        return Response({"status": f"Ahora sigues a {empresa.nombre}"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def dejar_de_seguir(self, request, pk=None):
        empresa = self.get_object()
        empresa.seguidores.remove(request.user)
        return Response({"status": f"Has dejado de seguir a {empresa.nombre}"}, status=status.HTTP_200_OK)



@api_view(['GET'])
def empresa_detail(request, pk):
    try:
        empresa = Empresa.objects.get(pk=pk)
    except Empresa.DoesNotExist:
        return Response({"error": "Empresa no encontrada"}, status=404)

    serializer = EmpresaSerializer(empresa)
    return Response(serializer.data)
