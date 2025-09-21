import uuid
from .supabase_client import supabase
from urllib.parse import urlparse

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
