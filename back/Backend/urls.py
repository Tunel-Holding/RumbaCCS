from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),          # tus usuarios, login, etc.
    path('api/', include('empresa.urls')),      # router de empresas
]

