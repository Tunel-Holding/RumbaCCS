from django.db.models.signals import post_delete
from django.dispatch import receiver
from supabase import create_client
from django.conf import settings
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# supabase_client.py
def upload_image_to_supabase(file):
    bucket = "eventos"

    # Leer bytes del archivo
    if hasattr(file, "read"):  # si es InMemoryUploadedFile de Django
        file_bytes = file.read()
    else:
        file_bytes = file

    filename = f"{file.name}"  # o genera un nombre único, ej: f"{uuid4()}.jpg"

    try:
        # Subir archivo al bucket
        supabase.storage.from_(bucket).upload(filename, file_bytes)
    except Exception as e:
        raise Exception(f"Error al subir a Supabase: {e}")

    # Obtener URL pública directamente (ya es string)
    public_url = supabase.storage.from_(bucket).get_public_url(filename)
    return public_url


# @receiver(post_delete, sender=EmpresaEventoImagen)
# def delete_file_from_supabase(sender, instance, **kwargs):
#     if instance.image_path:  # asumiendo que guardas la ruta del archivo
#         supabase.storage.from_("tu-bucket").remove([instance.image_path])
