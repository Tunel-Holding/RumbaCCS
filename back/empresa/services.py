import uuid
from .supabase_client import supabase
from urllib.parse import urlparse
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from .models import CompanyProfileView, CompanyEventView

from django.conf import settings

def upload_empresa_profile_picture(file, empresa_id):
    bucket = "empresas"  # asegúrate de tener creado este bucket en Supabase
    ext = file.name.split(".")[-1]
    filename = f"empresa_{empresa_id}/logo/profile_{uuid.uuid4()}.{ext}"

    file_bytes = file.read()
    supabase.storage.from_(bucket).upload(filename, file_bytes)

    public_url = supabase.storage.from_(bucket).get_public_url(filename)
    return public_url


def delete_empresa_profile_picture(public_url):
    if not public_url:
        return

    path = urlparse(public_url).path  
    # Busca la parte después de "/empresas/"
    if "empresas/" in path:
        file_path = path.split("empresas/", 1)[1]
        supabase.storage.from_("empresas").remove([file_path])



class CustomPagination(PageNumberPagination):
    page_size = 10  # por defecto
    page_size_query_param = "page_size"  # permite ?page_size=20
    max_page_size = 20

    def get_paginated_response(self, data):
        return Response({
            "count": self.page.paginator.count,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data
        })



User = get_user_model()

class NoStaffAvailable(Exception):
    pass

def queryset_validadores(nombre_grupo='Validadores'):
    return User.objects.filter(
        is_active=True,
        is_staff=True,
        groups__name=nombre_grupo
    ).distinct()

@transaction.atomic
def asignar_empresa_por_menor_carga(empresa, nombre_grupo='Validadores', max_pendientes=None):
    empresa = empresa.__class__.objects.select_for_update().get(pk=empresa.pk)

    # Solo asignar si está pendiente y sin responsable
    if empresa.assigned_to or empresa.status != 'pending':
        return empresa

    staff_qs = queryset_validadores(nombre_grupo).annotate(
        pendientes=Count(
            'empresas_asignadas',
            filter=Q(empresas_asignadas__status='pending') &
                   Q(empresas_asignadas__review_status__in=['pending', 'assigned', 'in_review'])
        )
    )

    if max_pendientes is not None:
        staff_qs = staff_qs.filter(pendientes__lt=max_pendientes)

    staff_qs = staff_qs.order_by('pendientes', 'id')
    staff = staff_qs.first()
    if not staff:
        raise NoStaffAvailable('No hay validadores disponibles')

    empresa.assigned_to = staff
    empresa.assigned_at = timezone.now()
    empresa.review_status = 'assigned'
    empresa.save(update_fields=['assigned_to', 'assigned_at', 'review_status'])
    return empresa


def validate_image_with_sightengine(file):
    """
    Envía la imagen a Sightengine y valida que sea segura.
    Retorna True si la imagen es válida, False si no.
    """
    import requests

    api_user =  settings.SIGHTENGINE_API_USER
    api_secret = settings.SIGHTENGINE_API_SECRET

    try:
        response = requests.post(
            "https://api.sightengine.com/1.0/check.json",
            files={"media": file},
            data={"models": "nudity,wad,offensive", "api_user": api_user, "api_secret": api_secret},
        )
        result = response.json()
        print("Sightengine result:", result)  # 👈 para depuración

        # 👇 Lógica simple: puedes ajustar los umbrales
        if result.get("status") != "success":
            return False

        nudity = result.get("nudity", {})
        if nudity.get("safe", 0) < 0.80:  # menos del 80% seguro
            return False

        return True
    except Exception:
        return False

def register_profile_view(empresa, usuario):
    CompanyProfileView.objects.get_or_create(empresa=empresa, usuario=usuario)

def register_event_view(evento, usuario):
    CompanyEventView.objects.get_or_create(evento=evento, usuario=usuario)
