from django.db import models
from django.conf import settings
from empresa.models import Evento2
import uuid

class Reserva(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('confirmed', 'Confirmada'),
        ('cancelled', 'Cancelada'),
        ('used', 'Usada'),
    ]

    usuario = models.ForeignKey(
        'api.Usuario', 
        on_delete=models.CASCADE, 
        related_name='reserva_usuarios'
    )
    evento = models.ForeignKey(
        Evento2, 
        on_delete=models.CASCADE, 
        related_name='reserva_tickets'
    )
    codigo_qr = models.CharField(max_length=100, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    cantidad = models.PositiveIntegerField(default=1)
    fecha_reserva = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.codigo_qr:
            # Generamos un código único basado en UUID para el QR
            self.codigo_qr = f"RUMBA-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Reserva {self.codigo_qr} - {self.evento.titulo}"

    class Meta:
        verbose_name = 'Reserva'
        verbose_name_plural = 'Reservas'
        ordering = ['-fecha_reserva']
