import uuid
from urllib.parse import urlparse
from supabase import create_client
from django.conf import settings


supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def upload_user_profile_picture(file, user_id):
    bucket = "usuarios"
    ext = file.name.split(".")[-1]
    filename = f"user_{user_id}/profile/profile_{uuid.uuid4()}.{ext}"

    file_bytes = file.read()
    supabase.storage.from_(bucket).upload(filename, file_bytes)

    public_url = supabase.storage.from_(bucket).get_public_url(filename)
    return {
        "path": filename,
        "public_url": public_url,
    }


def delete_user_profile_picture(file_path):
    """
    Elimina una imagen del bucket 'usuarios' usando su ruta interna.
    Ejemplo de file_path: 'user_15/profile/profile_1234.jpg'
    """
    if not file_path:
        return

    bucket = "usuarios"

    try:
        supabase.storage.from_(bucket).remove([file_path])
    except Exception as e:
        print(f"Error al eliminar imagen de Supabase: {e}")
