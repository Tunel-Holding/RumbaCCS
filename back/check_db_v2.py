import os
import django
import sys
from unittest.mock import MagicMock

# Monkeypatch celery if it's not installed
sys.modules['celery'] = MagicMock()
sys.modules['django_celery_beat'] = MagicMock()
sys.modules['django_celery_beat.schedulers'] = MagicMock()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.settings')
django.setup()

from empresa.models import Evento
print(f"TOTAL_COUNT: {Evento.objects.count()}")
for e in Evento.objects.all():
    print(f"EVENT: {e.titulo} (ID: {e.id}) - Date: {e.fecha_evento}")
