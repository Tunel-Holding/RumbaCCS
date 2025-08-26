from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('empresa', '0006_alter_evento2_options'),  # ajusta a tu última migración real
    ]

    operations = [
        migrations.AlterField(
            model_name='evento2',  # usa el nombre real del modelo en minúsculas
            name='empresa',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='eventos',
                help_text='Empresa dueña de este evento',
                to='empresa.Empresa'
            ),
        ),
    ]
