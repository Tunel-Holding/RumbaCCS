from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator, MinLengthValidator, URLValidator, EmailValidator
from django.core.exceptions import ValidationError
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from django.contrib.postgres.indexes import GinIndex
from django.contrib.auth.hashers import make_password, check_password

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
        null=False
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

    telefono = models.CharField(
        max_length=20,
        blank=True, null=True,
        validators=[RegexValidator(r'^\+?1?\d{7,15}$', message="El teléfono debe tener entre 7 y 15 dígitos.")]
    )

    email_contacto = models.EmailField(
        blank=True, null=True,
        validators=[EmailValidator(message="Debe ser un correo electrónico válido.")]
    )

    email = models.EmailField(unique=True, default="")  # para login de la empresa

    redes_sociales = models.URLField(
        blank=True, null=True,
        validators=[URLValidator(message="Debe ser una URL válida.")]
    )

    logo = models.ImageField(upload_to="logos_empresas/", blank=True, null=True)

    seguidores = models.ManyToManyField(
        Usuario,
        related_name="empresas_que_sigue",
        blank=True,
        help_text="Usuarios que siguen esta empresa"
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ["nombre"]
        

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

    # Fechas
    # fecha_inicio = models.DateTimeField(help_text="Fecha y hora de inicio")

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
        max_length=255,
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

    # Imagen
    imagen = models.ImageField(
        upload_to="eventos_imagenes/",
        blank=True,
        null=True,
        help_text="Imagen promocional del evento"
    )

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Evento"
        verbose_name_plural = "Eventos"
        ordering = ["-id"]
        # ordering = ["-fecha_inicio"]

    def __str__(self):
        return f"{self.titulo} – {self.empresa.nombre}"

    # def clean(self):
    #     if self.fecha_fin and self.fecha_inicio and self.fecha_fin <= self.fecha_inicio:
    #         raise ValidationError("La fecha de fin debe ser posterior a la fecha de inicio.")
    
