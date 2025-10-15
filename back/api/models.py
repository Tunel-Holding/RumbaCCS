from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.db import models

from django.contrib.auth.models import BaseUserManager

class UsuarioManager(BaseUserManager):
    def create_user(self, email, username=None, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        if not username:
            raise ValueError('El nombre de usuario es obligatorio')
        if not password:
            raise ValueError('La contraseña es obligatoria')

        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True')

        return self.create_user(email, username, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    GENERO_CHOICES = [
        ('masculino', 'Masculino'),
        ('femenino', 'Femenino'),
    ]
    
    ESTADO_CHOICES = [
        ('Amazonas', 'Amazonas'),
        ('Anzoátegui', 'Anzoátegui'),
        ('Apure', 'Apure'),
        ('Aragua', 'Aragua'),
        ('Barinas', 'Barinas'),
        ('Bolívar', 'Bolívar'),
        ('Carabobo', 'Carabobo'),
        ('Cojedes', 'Cojedes'),
        ('Delta Amacuro', 'Delta Amacuro'),
        ('Distrito Capital', 'Distrito Capital'),
        ('Falcón', 'Falcón'),
        ('Guárico', 'Guárico'),
        ('Lara', 'Lara'),
        ('Mérida', 'Mérida'),
        ('Miranda', 'Miranda'),
        ('Monagas', 'Monagas'),
        ('Nueva Esparta', 'Nueva Esparta'),
        ('Portuguesa', 'Portuguesa'),
        ('Sucre', 'Sucre'),
        ('Táchira', 'Táchira'),
        ('Trujillo', 'Trujillo'),
        ('La Guaira', 'La Guaira'),
        ('Yaracuy', 'Yaracuy'),
        ('Zulia', 'Zulia'),
    ]

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=100)
    phone = models.BigIntegerField(
        validators=[MinValueValidator(1000000000), MaxValueValidator(9999999999)]
    )
    birthday = models.DateField(null=True, blank=True)
    region = models.CharField(max_length=20, choices=ESTADO_CHOICES)
    gender = models.CharField(max_length=9, choices=GENERO_CHOICES)
    
    avatar_path = models.CharField(max_length=512, blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)

    # Campos de control recomendados
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    # def delete(self, *args, **kwargs):
    #     if self.avatar_path:
    #         try:
    #             supabase.storage.from_(settings.SUPABASE_BUCKET).remove([self.avatar_path])
    #         except Exception:
    #             pass
    #     super().delete(*args, **kwargs)

    # def __str__(self):
    #     return self.username


class EmailVerification(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    purpose = models.CharField(max_length=50, default="register")  # "register" o "reset"

    def __str__(self):
        return f"{self.email} - {self.purpose}"

