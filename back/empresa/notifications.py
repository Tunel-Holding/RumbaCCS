# apps/empresas/notifications.py
from django.core.mail import send_mail
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Empresa, NotificacionUsuario, UsuarioEvento, Evento2
from datetime import timedelta, datetime
from django.utils import timezone
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


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


def crear_notificacion_usuario(usuario, mensaje, tipo):
    NotificacionUsuario.objects.create(
        usuario=usuario,
        mensaje=mensaje,
        tipo=tipo
    )

@shared_task
def notificar_eventos_proximos():
    logger.info("Ejecutando tarea notificar_eventos_proximos")
    mañana = timezone.now() + timedelta(days=1)
    eventos = UsuarioEvento.objects.filter(evento__fecha_evento__date=mañana.date())
    logger.info(f"Eventos encontrados: {eventos.count()}")
    
    for registro in eventos:
        crear_notificacion_usuario(
            usuario=registro.usuario,
            mensaje=f"Tu evento '{registro.evento.titulo}' es mañana 🎉",
            tipo='evento_proximo'
        )



@receiver(post_save, sender=Evento2)
def notificar_evento_nuevo(sender, instance, created, **kwargs):
    if created and instance.empresa:
        seguidores = instance.empresa.seguidores.all()
        for usuario in seguidores:
            crear_notificacion_usuario(
                usuario=usuario,
                mensaje=f"{instance.empresa.nombre} publicó un nuevo evento: {instance.titulo}",
                tipo='nuevo_evento'
            )

@shared_task
def notificar_eventos_guardados_por_dias():
    hoy = timezone.localtime().date()  # asegura que usamos zona local
    dias_objetivo = [10, 5, 3]    

    for dias in dias_objetivo:
        fecha_objetivo = hoy + timedelta(days=dias)
        
        # rango completo del día (00:00:00 a 23:59:59) para no perder eventos
        inicio_dia = timezone.make_aware(datetime.combine(fecha_objetivo, datetime.min.time()))
        fin_dia = timezone.make_aware(datetime.combine(fecha_objetivo, datetime.max.time()))
        
        registros = UsuarioEvento.objects.filter(
            evento__fecha_evento__gte=inicio_dia,
            evento__fecha_evento__lte=fin_dia
        )

        logger.info(f"[evento_guardado] Día objetivo: {dias}, registros encontrados: {registros.count()}")

        for registro in registros:
            # enviamos notificación aunque la hora ya haya pasado
            crear_notificacion_usuario(
                usuario=registro.usuario,
                mensaje=f"Faltan {dias} días para tu evento '{registro.evento.titulo}' 🎉",
                tipo='evento_guardado_proximo'
            )
            logger.info(f"[evento_guardado] Notificación creada para {registro.usuario.email} - {registro.evento.titulo}")
            
