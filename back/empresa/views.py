from api.models import EmailVerification, Usuario
from django.utils import timezone
import random
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.decorators import action, api_view
from rest_framework import status
from .models import Empresa, Evento2, Usuario
from .serializers import EmpresaSerializer, EventoSerializer, EmpresaRegistroSerializer
from .permissions import IsEmpresaUser
from rest_framework import viewsets, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.renderers import JSONRenderer

class EmpresaPreRegistroView(generics.CreateAPIView):
    serializer_class = EmpresaRegistroSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Retornar los errores completos del serializer
            return Response(serializer.errors, status=400)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        nombre = serializer.validated_data['nombre']
        phone = serializer.validated_data.get('phone')
        birthday = serializer.validated_data.get('birthday')
        region = serializer.validated_data.get('region')
        gender = serializer.validated_data.get('gender')

        # Generar y guardar pin y datos temporales
        pin = str(random.randint(100000, 999999))
        EmailVerification.objects.update_or_create(
            email=email,
            defaults={
                'code': pin,
                'created_at': timezone.now(),
                'expires_at': timezone.now() + timezone.timedelta(minutes=15),
                'is_verified': False,
            }
        )
        # Enviar el correo con el pin usando Django
        send_mail(
            'Tu código de validación para empresa',
            f'Tu código de validación para empresa es: {pin}',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )

        # Puedes guardar los datos en el frontend y reenviarlos en la validación
        return Response({"detail": "Se ha enviado un pin de verificación al correo."}, status=201)

# --- Validar pin y crear empresa ---
class EmpresaValidarPinView(generics.CreateAPIView):
    serializer_class = EmpresaSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        email = request.data.get('email')
        pin = request.data.get('pin')
        empresa_data = request.data.get('empresa', {})
        # Filtrar solo los campos válidos para Empresa
        empresa_fields = [
            'nombre', 'rif', 'descripcion', 'lugar', 'telefono', 'email_contacto', 'redes_sociales', 'logo'
        ]
        empresa_data = {k: v for k, v in empresa_data.items() if k in empresa_fields}

        password = request.data.get('password', "00000000")
        nombre = empresa_data.get('nombre')
        phone = empresa_data.get('telefono')
        # Buscar gender en request principal, si no está, tomarlo de empresa_data
        gender = request.data.get('gender', empresa_data.get('gender'))

        print(f"[VALIDAR PIN] email={email}, pin={pin}, empresa_data={empresa_data}")

        # Validar pin
        try:
            verif = EmailVerification.objects.get(email=email, code=pin, is_verified=False)
        except EmailVerification.DoesNotExist:
            print(f"[VALIDAR PIN] No se encontró registro para email={email}, pin={pin}, is_verified=False")
            return Response({"detail": "Pin inválido o expirado."}, status=400)

        if verif.expires_at < timezone.now():
            print(f"[VALIDAR PIN] Pin expirado para email={email}, pin={pin}")
            return Response({"detail": "Pin expirado."}, status=400)

        # Validar campos obligatorios para usuario
        usuario_fields = {
            'email': email,
            'password': password,
            'username': nombre,
            'phone': phone,
            'gender': gender,
            'is_active': True
        }
        # Elimina los campos None para evitar IntegrityError
        usuario_fields = {k: v for k, v in usuario_fields.items() if v is not None}
        if 'gender' not in usuario_fields or usuario_fields['gender'] is None:
            # Si no hay gender, pero el modelo lo requiere, poner un valor por defecto
            usuario_fields['gender'] = 'masculino'

        usuario = Usuario.objects.create_user(**usuario_fields)
        verif.is_verified = True
        verif.save()

        empresa = Empresa.objects.create(usuario=usuario, **empresa_data)

        print(f"[VALIDAR PIN] Empresa creada correctamente para email={email}")
        # Generar tokens JWT para el usuario recién creado
        tokens = get_tokens_for_user(usuario)
        # Serializar la empresa para incluir id y demás campos
        empresa_data = EmpresaSerializer(
            empresa,
            context={"request": request}
        ).data
        # Unir la info de empresa con los tokens
        response_data = {
            "message": "Registro exitoso",
            **empresa_data,
            "access": tokens["access"],
            "refresh": tokens["refresh"],
        }
        return Response(response_data, status=201)

# -----------------------------
# ViewSet principal para Empresa
# -----------------------------
class EmpresaViewSet(ModelViewSet):
    serializer_class = EmpresaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    queryset = Empresa.objects.all()

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
    permission_classes       = [permissions.AllowAny]
    serializer_class         = EventoSerializer

    def get_queryset(self):
        # Si viene empresa_pk en la URL, filtra por esa empresa
        empresa_id = self.kwargs.get('empresa_pk')
        qs = Evento2.objects.all().order_by('-id')
        return qs.filter(empresa_id=empresa_id) if empresa_id else qs

    def perform_create(self, serializer):
        empresa_id = self.kwargs.get('empresa_pk')
        print("CREANDO EVENTO PARA EMPRESA:", empresa_id)
        print("DATOS POST:", self.request.data)

        serializer.save(empresa_id=empresa_id)
        

class EventosPublicosViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Evento2.objects.all().order_by('-id')  # orden por id
    serializer_class = EventoSerializer
    permission_classes = [AllowAny]  # público, no requiere token

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class EmpresaRegistroView(generics.CreateAPIView):
    serializer_class = EmpresaRegistroSerializer
    renderer_classes   = [JSONRenderer]
    permission_classes = [AllowAny]  # porque es registro inicial
    
    
    def create(self, request, *args, **kwargs):
        
        # 1. Validar datos de entrada
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 2. Crear el objeto Empresa (internamente crea al Usuario)
        empresa = serializer.save()

        # 3. Generar tokens JWT para el usuario recién creado
        usuario = empresa.usuario
        tokens  = get_tokens_for_user(usuario)

        # 4. Serializar la empresa para incluir id y demás campos
        empresa_data = EmpresaSerializer(
            empresa,
            context={"request": request}
        ).data

        # 5. Unir la info de empresa con los tokens
        response_data = {
            **empresa_data,
            "access":  tokens["access"],
            "refresh": tokens["refresh"],
        }

        # 6. Devolver respuesta con status 201
        headers = self.get_success_headers(response_data)
        return Response(
            response_data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
