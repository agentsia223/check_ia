"""
Migration that previously removed unused Django auth tables.
The tables were already dropped via Supabase migrations.
This is now a no-op to keep Django's migration history consistent.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('factcheck', '0006_replace_django_user_with_supabase_fields'),
    ]

    operations = [
        # No-op: auth tables were removed via Supabase migration.
        # This file exists to match the django_migrations record.
    ]
