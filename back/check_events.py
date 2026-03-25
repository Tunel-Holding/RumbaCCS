from empresa.models import Evento
print(f'Total Eventos: {Evento.objects.count()}')
for e in Evento.objects.all():
    print(f'- {e.titulo} (ID: {e.id})')
