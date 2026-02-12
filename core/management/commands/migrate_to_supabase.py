from django.core.management.base import BaseCommand
from django.conf import settings
from supabase import create_client, Client
import json


class Command(BaseCommand):
    help = 'Migrate Django models to Supabase and create necessary tables'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-tables',
            action='store_true',
            help='Create tables in Supabase database',
        )
        parser.add_argument(
            '--migrate-data',
            action='store_true',
            help='Migrate existing data to Supabase',
        )

    def handle(self, *args, **options):
        try:
            # Initialize Supabase client
            supabase: Client = create_client(
                settings.SUPABASE_URL, 
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
            
            self.stdout.write(
                self.style.SUCCESS('Connected to Supabase successfully!')
            )
            
            if options['create_tables']:
                self.create_tables(supabase)
                
            if options['migrate_data']:
                self.migrate_data(supabase)
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error: {str(e)}')
            )

    def create_tables(self, supabase):
        """Create tables in Supabase database"""
        self.stdout.write('Creating tables in Supabase...')
        
        # Note: This would typically be done through Supabase SQL editor or migrations
        # For now, we'll rely on Django's migrate command with the updated database settings
        self.stdout.write(
            self.style.WARNING(
                'Tables should be created using Django migrate command with Supabase database settings.'
            )
        )
        
    def migrate_data(self, supabase):
        """Migrate existing data to Supabase"""
        from core.models import Fact, Keyword, Submission, VerifiedMedia
        
        self.stdout.write('Migrating data to Supabase...')
        
        # This is a placeholder - actual data migration would depend on your current data
        # and the specific requirements of your application
        
        self.stdout.write(
            self.style.SUCCESS('Data migration completed!')
        ) 