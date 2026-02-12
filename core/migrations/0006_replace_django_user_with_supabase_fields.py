"""
Migration to replace Django User foreign key with Supabase user fields.
This migration matches the already-applied state in the database.
"""
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('factcheck', '0005_fact_web_sources'),
    ]

    operations = [
        # Remove the old Django User FK
        migrations.RemoveField(
            model_name='submission',
            name='utilisateur',
        ),
        # Add Supabase user fields
        migrations.AddField(
            model_name='submission',
            name='supabase_user_id',
            field=models.UUIDField(default=uuid.uuid4),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='submission',
            name='user_email',
            field=models.EmailField(default='', max_length=254),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='submission',
            name='user_name',
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
