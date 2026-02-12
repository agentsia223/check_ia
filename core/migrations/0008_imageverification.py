"""
Migration to create the ImageVerification model.
This matches the table already present in the database (created via Supabase migrations).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('factcheck', '0007_remove_unused_django_auth_tables'),
    ]

    operations = [
        migrations.CreateModel(
            name='ImageVerification',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('supabase_user_id', models.UUIDField()),
                ('user_email', models.EmailField(max_length=254)),
                ('user_name', models.CharField(blank=True, max_length=150)),
                ('image_path', models.CharField(max_length=1000)),
                ('image_url', models.URLField(max_length=1000)),
                ('original_filename', models.CharField(max_length=255)),
                ('claim_text', models.TextField(blank=True, null=True)),
                ('verification_type', models.CharField(choices=[('content', 'Content Verification'), ('ai_detection', 'AI Detection')], max_length=50)),
                ('status', models.CharField(choices=[('EN_COURS', 'En cours'), ('VRAIE', 'Vraie'), ('FAUSSE', 'Fausse'), ('INDÉTERMINÉE', 'Indéterminée'), ('ANALYSÉE', 'Analysée'), ('IA_DÉTECTÉE', 'IA Détectée'), ('AUTHENTIQUE', 'Authentique'), ('INCERTAIN', 'Incertain'), ('ERREUR', 'Erreur')], max_length=50)),
                ('explanation', models.TextField()),
                ('confidence', models.IntegerField(default=0)),
                ('details', models.JSONField(blank=True, null=True)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('model_used', models.CharField(default='google/gemini-2.0-flash-001', max_length=100)),
            ],
            options={
                'ordering': ['-date'],
            },
        ),
    ]
