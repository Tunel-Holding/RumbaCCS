import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.settings')
django.setup()

from empresa.models import Evento
print(f"TOTAL_COUNT: {Evento.objects.count()}")
for e in Evento.objects.all():
    print(f"EVENT: {e.titulo} (ID: {e.id})")
