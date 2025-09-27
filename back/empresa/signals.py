# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from .models import Empresa

@receiver(post_save, sender=Empresa)
def notificar_cambio_status(sender, instance: Empresa, created, **kwargs):
    if created:
        return
    # Notificación por email (simplificada)
    if instance.status == 'approved':
        send_mail(
            subject="Tu empresa fue aprobada",
            message=f"Hola {instance.nombre}, tu empresa fue verificada. ¡Ya puedes acceder a las funciones avanzadas!",
            from_email="no-reply@tuapp.com",
            recipient_list=[instance.email],
            fail_silently=True,
        )
    elif instance.status == 'rejected' and instance.email:
        send_mail(
            subject="Tu empresa fue rechazada",
            message=f"Hola {instance.nombre}, tu verificación fue rechazada.\nMotivo: {instance.rejection_reason or 'Sin detalle'}",
            from_email="no-reply@tuapp.com",
            recipient_list=[instance.email],
            fail_silently=True,
        )