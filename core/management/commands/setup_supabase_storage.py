from django.core.management.base import BaseCommand
from core.services.supabase_storage import create_bucket_if_not_exists
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Set up Supabase storage bucket for image verifications'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Setting up Supabase storage...'))
        
        try:
            result = create_bucket_if_not_exists()
            
            if result["success"]:
                if result.get("created"):
                    self.stdout.write(
                        self.style.SUCCESS('✓ Bucket "image-verifications" created successfully!')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS('✓ Bucket "image-verifications" already exists!')
                    )
                
                self.stdout.write(
                    self.style.SUCCESS('Supabase storage setup completed successfully!')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'✗ Failed to setup bucket: {result.get("error")}')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error setting up Supabase storage: {str(e)}')
            ) 