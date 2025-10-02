import uuid
from supabase import create_client
from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import EventoImagen

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


# def upload_image_to_supabase(file, empresa_id, evento_id):
#     bucket = "eventos_publicos"

#     # leer bytes
#     file_bytes = file.read()

#     # extensión y nombre único
#     ext = file.name.split(".")[-1]
#     filename = f"{uuid.uuid4()}.{ext}"

#     # path organizado
#     path = f"empresa_{empresa_id}/evento_{evento_id}/imagenes/{filename}"

#     try:
#         supabase.storage.from_(bucket).upload(path, file_bytes)
#     except Exception as e:
#         raise Exception(f"Error al subir a Supabase: {e}")

#     # si el bucket es público
#     public_url = supabase.storage.from_(bucket).get_public_url(path)

#     return path, public_url

def upload_image_to_supabase(file, empresa_id, evento_id):
    bucket = "eventos_publicos"

    file.seek(0)  # ⬅️ reiniciar el stream
    file_bytes = file.read()

    ext = file.name.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"

    path = f"empresa_{empresa_id}/evento_{evento_id}/imagenes/{filename}"

    mime_type = file.content_type or "application/octet-stream"  # ⬅️ aseguramos tipo correcto

    try:
        supabase.storage.from_(bucket).upload(path, file_bytes, {"content-type": mime_type})
    except Exception as e:
        raise Exception(f"Error al subir a Supabase: {e}")

    public_url = supabase.storage.from_(bucket).get_public_url(path)

    return path, public_url


@receiver(post_delete, sender=EventoImagen)
def delete_file_from_supabase(sender, instance, **kwargs):
    bucket = "eventos"
    if instance.path:
        try:
            supabase.storage.from_(bucket).remove([instance.path])
        except Exception as e:
            print(f"Error al borrar de Supabase: {e}")