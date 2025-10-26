# apps/empresas/notifications.py
from django.core.mail import send_mail
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import timedelta, datetime
from django.utils import timezone
from celery import shared_task
from django.utils import timezone
import logging
from .models import Empresa, CompanyProfileView, CompanyEventView, Evento2, EmpresaMetricNotification, NotificacionEmpresa
from django.db.models import Count

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
        

@shared_task
def notificar_metricas_empresas():
    ahora = timezone.now()
    inicio_mes = ahora.replace(day=1)
    ayer = ahora.date() - timedelta(days=1)

    UMBRAL_PERFIL = 5
    UMBRAL_EVENTO = 3

    for empresa in Empresa.objects.all():
        # 📊 1. Métrica de perfil mensual
        periodo_mes = ahora.strftime("%Y-%m")
        if not NotificacionEmpresa.objects.filter(
            empresa=empresa,
            tipo='metricas_perfil',
            metadata__periodo=periodo_mes
        ).exists():
            vistas_mes = CompanyProfileView.objects.filter(
                empresa=empresa,
                timestamp__gte=inicio_mes
            ).count()

            if vistas_mes >= UMBRAL_PERFIL:
                ya_registrada = EmpresaMetricNotification.objects.filter(
                    empresa=empresa,
                    tipo='perfil',
                    periodo=periodo_mes
                ).exists()

                if not ya_registrada:
                    NotificacionEmpresa.objects.create(
                        empresa=empresa,
                        mensaje=f"📈 {vistas_mes} usuarios han visto tu perfil este mes.",
                        tipo='metricas_perfil',
                        metadata={'periodo': periodo_mes}
                    )
                    EmpresaMetricNotification.objects.create(
                        empresa=empresa,
                        tipo='perfil',
                        periodo=periodo_mes,
                        enviado=True
                    )

        # 📊 2. Métrica de eventos finalizados ayer
        eventos_finalizados = Evento2.objects.filter(
            empresa=empresa,
            fecha_evento__date=ayer
        ).annotate(total_vistas=Count('views'))

        for evento in eventos_finalizados:
            periodo_evento = evento.fecha_evento.strftime("%Y-%m-%d")

            ya_registrada_evento = EmpresaMetricNotification.objects.filter(
                empresa=empresa,
                tipo='evento',
                referencia_id=evento.id,
                periodo=periodo_evento
            ).exists()

            if not ya_registrada_evento and evento.total_vistas >= UMBRAL_EVENTO:
                NotificacionEmpresa.objects.create(
                    empresa=empresa,
                    mensaje=f"🎉 {evento.total_vistas} usuarios han visto tu evento '{evento.titulo}' hasta su fecha.",
                    tipo='metricas_evento',
                    metadata={'periodo': periodo_evento, 'evento_id': evento.id}
                )
                EmpresaMetricNotification.objects.create(
                    empresa=empresa,
                    tipo='evento',
                    referencia_id=evento.id,
                    periodo=periodo_evento,
                    enviado=True
                )
