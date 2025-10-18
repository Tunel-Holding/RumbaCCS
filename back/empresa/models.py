from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator, MinLengthValidator, URLValidator, EmailValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from django.contrib.postgres.indexes import GinIndex
from django.contrib.auth.hashers import make_password, check_password
import uuid
from django.conf import settings


Usuario = get_user_model()

class Empresa(models.Model):
    
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name="empresa",
        help_text="Usuario administrador de esta empresa",
        blank= True, null= True,
    )

    password = models.CharField(max_length=128, default="00000000", help_text="Contraseña para login de la empresa")
    avatar_path = models.CharField(max_length=512, blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)
    logo = models.URLField(blank=True, null=True,default='')  # solo guardamos URL

    def set_password(self, raw_password):
        self.password = make_password(raw_password)
        self.save(update_fields=['password'])

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)
    
    nombre = models.CharField(
        max_length=255,
        unique=True,
        validators=[MinLengthValidator(2)],
        help_text="Nombre legal de la empresa (único)",
        blank=False,
        null=False,
        db_index=True
    )

    rif = models.CharField(
        max_length=15,
        unique=True,
        validators=[
            RegexValidator(
                r'^[A-Z]-\d{8}-\d$',
                message="Formato de RIF inválido. Ejemplo válido: J-12345678-9"
            )
        ],
        help_text="RIF de la empresa (único)",
        blank=False,
        null=False
    )

    descripcion = models.TextField(blank=True, null=True)

    lugar = models.CharField(  # Antes 'direccion'
        max_length=255,
        blank=True,
        null=True,
        help_text="Ubicación o ciudad principal de la empresa"
    )

    phone = models.CharField(
        max_length=20,
        blank=True, null=True,
        validators=[RegexValidator(r'^\+?1?\d{7,15}$', message="El teléfono debe tener entre 7 y 15 dígitos.")]
    )

    email_contacto = models.EmailField(
        blank=True, null=True,
        validators=[EmailValidator(message="Debe ser un correo electrónico válido.")]
    )

    email = models.EmailField(unique=True, default="")  # para login de la empresa
    
    seguidores = models.ManyToManyField(
        Usuario,
        related_name="empresas_que_sigue",
        blank=True,
        help_text="Usuarios que siguen esta empresa"
    )

     # Estados de verificación manual y auditoría
   
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pendiente'),
            ('approved', 'Aprobada'),
            ('rejected', 'Rechazada'),
        ],
        default='pending'
    )
    company_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='empresas_verificadas'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)


    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True, db_index=True)
    
    # Asignación de responsable de verificación
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='empresas_asignadas',
        help_text='Validador asignado para revisar esta empresa'
    )
    assigned_at = models.DateTimeField(null=True, blank=True)

    # Opcional: estado interno del proceso de revisión (no reemplaza tu status)
    review_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pendiente'),
            ('assigned', 'Asignada'),
            ('in_review', 'En revisión'),
        ],
        default='pending',
        help_text='Estado del proceso de revisión (independiente de approved/rejected)'
    )

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ["nombre"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["rif"]),
            models.Index(fields=["email"]),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['review_status']),
        ]

    # Método liviano para iniciar revisión por el asignado
    def start_review(self, user):
        if self.assigned_to_id != user.id:
            return
        if self.review_status in ('pending', 'assigned'):
            self.review_status = 'in_review'
            self.save(update_fields=['review_status'])
            
                
        
    def __str__(self):
        return self.nombre

    def clean(self):
        if self.nombre and len(self.nombre) < 2:
            raise ValidationError({"nombre": "El nombre de la empresa debe tener al menos 2 caracteres."})
        if self.telefono and not self.telefono.replace("+", "").isdigit():
            raise ValidationError({"telefono": "El teléfono solo puede contener dígitos y un '+' opcional."})
        
    # 🔹 Total de seguidores
    @property
    def total_seguidores(self):
        return self.seguidores.count()

    # 🔹 Total de eventos publicados
    @property
    def eventos_publicados(self):
        # si ya tienes un modelo Evento con ForeignKey a Empresa:
        return self.eventos.count() if hasattr(self, "eventos") else 0
    
    # Métodos de negocio para verificación
    def approve(self, user, notes=""):
        self.company_verified = True
        self.status = 'approved'
        self.verified_by = user
        self.verified_at = timezone.now()
        self.verification_notes = notes or self.verification_notes
        self.rejection_reason = ""  # limpia rechazo previo si lo hubo
        self.save(update_fields=[
            'company_verified', 'status', 'verified_by', 'verified_at', 'verification_notes', 'rejection_reason'
        ])

    def reject(self, user, reason=""):
        self.company_verified = False
        self.status = 'rejected'
        self.verified_by = user
        self.verified_at = timezone.now()
        self.rejection_reason = reason or self.rejection_reason
        self.save(update_fields=[
            'company_verified', 'status', 'verified_by', 'verified_at', 'rejection_reason'
        ])


class EmpresaRedSocial(models.Model):
    RED_CHOICES = [
        ('instagram', 'Instagram'),
        ('facebook', 'Facebook'),
        ('tiktok', 'TikTok'),
        ('x', 'X (Twitter)'),
        ('youtube', 'YouTube'),
        ('whatsapp', 'WhatsApp'),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='redes')
    tipo = models.CharField(max_length=20, choices=RED_CHOICES)
    url = models.URLField(max_length=512)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Red social de empresa"
        verbose_name_plural = "Redes sociales de empresa"
        unique_together = ('empresa', 'tipo')

    def __str__(self):
        return f"{self.empresa.nombre} - {self.get_tipo_display()}: {self.url}"



class Evento2(models.Model):
    indexes = [
            GinIndex(fields=["categoria"], name="idx_evento_categoria_gin"),
        ]
    
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name="eventos",
        help_text="Empresa dueña de este evento"
    )
    
    CATEGORIA_CHOICES = [
    ('Concierto', 'Concierto'),
    ('Feria', 'Feria'),
    ('Festival', 'Festival'),
    ('Exposición', 'Exposición'),
    ('Conferencia', 'Conferencia'),
    ('Workshop', 'Workshop'),
    ('Networking', 'Networking'),
    ('Show', 'Show'),
    ('Deportivo', 'Deportivo'),
    ('Cultural', 'Cultural'),
    ('Gastronómico', 'Gastronómico'),
    ('Tecnológico', 'Tecnológico'),
    ('Arte', 'Arte'),
    ('Música', 'Música'),
    ('Teatro', 'Teatro'),
]

    VESTIMENTA_CHOICES = [
        ('Formal', 'Formal'),
        ('Semi-formal', 'Semi-formal'),
        ('Casual', 'Casual'),
        ('Deportivo', 'Deportivo'),
        ('Elegante casual', 'Elegante casual'),
    ]

    EDAD_MINIMA_CHOICES = [
    (0, 'Todas las edades'),
    (13, 'Mayores de 13 años'),
    (16, 'Mayores de 16 años'),
    (18, 'Mayores de 18 años'),
    (21, 'Mayores de 21 años'),
    (25, 'Mayores de 25 años'),
]
    
    titulo = models.CharField(
        max_length=200,
        help_text="Título del evento"
    )
    descripcion = models.TextField(
        blank=True,
        null=False,
        help_text="Descripción detallada"
    )

    # Fecha y hora de inicio
    fecha_evento = models.DateTimeField(
        help_text="Fecha y hora de inicio del evento",
        default=timezone.now
    )

    # Selecciones y límites
    categoria = models.JSONField(
        default=list,
        blank=False,
        help_text="Lista de categorías seleccionadas"
    )
    codigo_vestimenta = models.CharField(
        max_length=50,
        blank=False,
        choices= VESTIMENTA_CHOICES,
        help_text="Código de vestimenta (selección)"
    )

    descripcion_vestimenta = models.TextField(
        blank=True,
        null=True,
        help_text="Descripción del código de vestimenta"
    )

    edad_minima = models.PositiveSmallIntegerField(
        blank=False,
        choices=EDAD_MINIMA_CHOICES,
        help_text="Edad mínima para asistir"
    )
    ubicacion = models.CharField(
        max_length=300,
        blank=True,
        null=True,
        help_text="Lugar o dirección del evento"
    )
    capacidad = models.PositiveIntegerField(
        default=0,
        help_text="Cupo máximo de asistentes (0 = ilimitado)"
    )

    # Precio y moneda
    precio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Precio de entrada"
    )
    moneda = models.CharField(
        max_length=3,
        default="USD",
        help_text="Código ISO de moneda (ej. USD, EUR)"
    )

    promote = models.BooleanField(default=False, help_text="Si el evento es promovido o destacado")
    want_promote = models.BooleanField(default=False, help_text="Si la empresa quiere promover este evento")
    
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Evento"
        verbose_name_plural = "Eventos"
        ordering = ["-id"]
        # ordering = ["-fecha_inicio"]

    def __str__(self):
        return f"{self.titulo} – {self.empresa.nombre}"

class EventoImagen(models.Model):
    evento = models.ForeignKey("Evento2", on_delete=models.CASCADE, related_name="imagenes")
    path = models.CharField(max_length=255,default="")  # ej: eventos/23/uuid.jpg
    url = models.URLField()  # URL pública o firmada
    creada_en = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.evento_id} - {self.url}"

class Rating(models.Model):
    empresa = models.ForeignKey(
        'Empresa',
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    usuario = models.ForeignKey(
        'api.Usuario',
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comentario = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Calificación"
        verbose_name_plural = "Calificaciones"
        unique_together = ('empresa', 'usuario')  # un usuario solo puede calificar una empresa una vez
        ordering = ['-creado_en']

    def __str__(self):
        return f"{self.usuario.username} → {self.empresa} : {self.rating}"

class EmpresaEvento(models.Model):
    empresa = models.ForeignKey('Empresa', on_delete=models.CASCADE, related_name='reservas')
    evento = models.ForeignKey('Evento2', on_delete=models.CASCADE, related_name='reservas')
    fecha_reserva = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.empresa.nombre} - {self.evento.titulo}"

# Nuevo modelo para eventos guardados por usuario
class UsuarioEvento(models.Model):
    usuario = models.ForeignKey('api.Usuario', on_delete=models.CASCADE, related_name='eventos_guardados')
    evento = models.ForeignKey('Evento2', on_delete=models.CASCADE, related_name='usuarios_guardaron')
    fecha_guardado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('usuario', 'evento')

    def __str__(self):
        return f"{self.usuario.username} guardó {self.evento.titulo}"



