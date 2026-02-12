from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from supabase import create_client, Client
import jwt
from jwt.exceptions import InvalidTokenError
import logging

logger = logging.getLogger(__name__)


class SimpleSupabaseUser:
    """
    Simple user object that holds Supabase user data without Django User dependency
    """
    def __init__(self, supabase_user):
        self.id = supabase_user.id
        self.email = supabase_user.email
        self.user_metadata = supabase_user.user_metadata
        self.is_authenticated = True
        self.is_active = True
        
    def __str__(self):
        return self.email


class SupabaseAuthentication(BaseAuthentication):
    """
    Custom authentication class for Supabase JWT tokens - Pure Supabase approach
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]

        try:
            supabase: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )

            user_response = supabase.auth.get_user(token)

            if not user_response.user:
                raise AuthenticationFailed('Invalid token')

            supabase_user = user_response.user
            
            # Return simple user object without Django User creation
            simple_user = SimpleSupabaseUser(supabase_user)
            
            return (simple_user, token)
            
        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            raise AuthenticationFailed(f'Authentication failed: {str(e)}') 