from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator, MinLengthValidator, URLValidator, EmailValidator
from django.core.exceptions import ValidationError

Usuario = get_user_model()

class Empresa(models.Model):
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name="empresa",
        help_text="Usuario administrador de esta empresa"
    )

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
        constraints = [
            models.UniqueConstraint(fields=["usuario"], name="unique_usuario_empresa")
        ]

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
    
    
class Evento(models.Model):
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name="eventos"
    )
    titulo = models.CharField(max_length=255)
    fecha = models.DateTimeField()
    descripcion = models.TextField(blank=True, null=True)
    lugar = models.CharField(max_length=255, blank=True, null=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    categoria = models.CharField(max_length=100, blank=True, null=True)
    imagen = models.ImageField(upload_to="eventos/", blank=True, null=True)
