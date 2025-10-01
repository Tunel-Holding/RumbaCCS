import uuid
from urllib.parse import urlparse
from supabase import create_client
from django.conf import settings


supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def upload_user_profile_picture(file, user_id):
    bucket = "usuarios"  # 👈 crea este bucket en Supabase (o usa el mismo con carpeta distinta)
    ext = file.name.split(".")[-1]
    filename = f"user_{user_id}/profile/profile_{uuid.uuid4()}.{ext}"

    file_bytes = file.read()
    supabase.storage.from_(bucket).upload(filename, file_bytes)

    public_url = supabase.storage.from_(bucket).get_public_url(filename)
    return public_url


def delete_user_profile_picture(public_url):
    if not public_url:
        return

    path = urlparse(public_url).path
    # Busca la parte después de "/usuarios/"
    if "usuarios/" in path:
        file_path = path.split("usuarios/", 1)[1]
        supabase.storage.from_("usuarios").remove([file_path])
