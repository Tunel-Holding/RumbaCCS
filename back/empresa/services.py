import uuid
from .supabase_client import supabase
from urllib.parse import urlparse
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

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
