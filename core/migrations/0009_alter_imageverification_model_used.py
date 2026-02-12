from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('factcheck', '0008_imageverification'),
    ]

    operations = [
        migrations.AlterField(
            model_name='imageverification',
            name='model_used',
            field=models.CharField(default='openai/gpt-4.1-mini', max_length=100),
        ),
    ]
