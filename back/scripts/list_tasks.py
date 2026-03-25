# list_tasks.py
from django_celery_beat.models import PeriodicTask
from django.utils import timezone

for task in PeriodicTask.objects.all():
    schedule = task.schedule
    last_run = task.last_run_at

    next_run_delta = None
    next_run_at = None

    if last_run is not None:
        try:
            next_run_delta = schedule.remaining_estimate(last_run_at=last_run)
            if next_run_delta:
                next_run_at = timezone.now() + next_run_delta
        except Exception as e:
            print(f"Error calculando próxima ejecución de {task.name}: {e}")

    print("Nombre:", task.name)
    print("Task:", task.task)
    print("Habilitada:", task.enabled)
    print("Última ejecución:", last_run)
    print("Próxima ejecución en:", next_run_delta)
    print("Próxima ejecución a las:", next_run_at)
    print("-" * 40)
