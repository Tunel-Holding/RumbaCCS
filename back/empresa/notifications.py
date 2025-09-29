# apps/empresas/notifications.py
from django.core.mail import send_mail
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Empresa

def notificar_asignacion_empresa(empresa):
    staff = empresa.assigned_to
    if not staff or not staff.email:
        return
    subject = f"Empresa asignada para verificación: {empresa.nombre}"
    nombre_staff = getattr(staff, "nombre", None) or getattr(staff, "username", None) or staff.email

    body = (
        f"Hola {nombre_staff},\n\n"
        f"Se te asignó la empresa '{empresa.nombre}' (RIF: {empresa.rif}) para verificación.\n"
        f"Estado actual: {empresa.status}\n"
        "Por favor, inicia su revisión en el panel.\n"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [staff.email], fail_silently=False)


@receiver(post_save, sender=Empresa)
def notificar_cambio_status(sender, instance: Empresa, created, **kwargs):
    if created:
        return
    # Notificación por email (simplificada)
    if instance.status == 'approved':
        send_mail(
            subject="Tu empresa fue aprobada",
            message=f"Hola {instance.nombre}, tu empresa fue verificada. ¡Ya puedes acceder a las funciones avanzadas!",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instance.email],
            fail_silently=True,
        )
    elif instance.status == 'rejected' and instance.email:
        send_mail(
            subject="Tu empresa fue rechazada",
            message=f"Hola {instance.nombre}, tu verificación fue rechazada.\nMotivo: {instance.rejection_reason or 'Sin detalle'}",
            from_email= settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instance.email],
            fail_silently=True,
        )