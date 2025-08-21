from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Empresa, Evento2
from .serializers import EmpresaSerializer, EventoSerializer
from .permissions import IsEmpresaUser
from rest_framework import viewsets, permissions
# -----------------------------
# ViewSet principal para Empresa
# -----------------------------
class EmpresaViewSet(ModelViewSet):
    serializer_class = EmpresaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Devuelve todas las empresas (para que un usuario pueda seguir cualquier empresa)
        return Empresa.objects.all()

    def perform_create(self, serializer):
        # Vincula automáticamente la empresa con el usuario que la crea
        serializer.save(usuario=self.request.user)

    # Acción para seguir una empresa
    @action(detail=True, methods=['post'])
    def seguir(self, request, pk=None):
        empresa = self.get_object()
        empresa.seguidores.add(request.user)
        return Response({"status": f"Ahora sigues a {empresa.nombre}"}, status=status.HTTP_200_OK)

    # Acción para dejar de seguir una empresa
    @action(detail=True, methods=['post'])
    def dejar_de_seguir(self, request, pk=None):
        empresa = self.get_object()
        empresa.seguidores.remove(request.user)
        return Response({"status": f"Has dejado de seguir a {empresa.nombre}"}, status=status.HTTP_200_OK)

# -----------------------------
# Endpoint de detalle de empresa
# -----------------------------
@api_view(['GET'])
def empresa_detail(request, pk):
    try:
        empresa = Empresa.objects.get(pk=pk)
    except Empresa.DoesNotExist:
        return Response({"error": "Empresa no encontrada"}, status=404)

    serializer = EmpresaSerializer(empresa, context={'request': request})
    return Response(serializer.data)

# -----------------------------
# Endpoint para obtener la empresa del usuario logueado
# -----------------------------
@api_view(['GET'])
def mi_empresa(request):
    try:
        empresa = request.user.empresa  # OneToOneField garantiza máximo una empresa
    except Empresa.DoesNotExist:
        return Response({"empresa_id": None}, status=200)

    serializer = EmpresaSerializer(empresa, context={'request': request})
    data = serializer.data
    data['empresa_id'] = empresa.id
    return Response(data, status=200)

class EventoViewSet(viewsets.ModelViewSet):
    
    authentication_classes = [JWTAuthentication]
    permission_classes       = [permissions.IsAuthenticated]
    serializer_class         = EventoSerializer

    def get_queryset(self):
        # Si viene empresa_pk en la URL, filtra por esa empresa
        empresa_id = self.kwargs.get('empresa_pk')
        qs = Evento2.objects.all()
        return qs.filter(empresa_id=empresa_id) if empresa_id else qs

    def perform_create(self, serializer):
        empresa_id = self.kwargs.get('empresa_pk')
        print("CREANDO EVENTO PARA EMPRESA:", empresa_id)
        print("DATOS POST:", self.request.data)

        serializer.save(empresa_id=empresa_id)
        
    
