from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from supabase import create_client, Client


class SupabaseAuthMiddleware(MiddlewareMixin):
    """
    Middleware to handle Supabase authentication for non-API requests
    """

    def process_request(self, request):
        # Skip API requests as they use the authentication class
        if request.path.startswith('/api/'):
            return None

        # Get token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        token = None

        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if token:
            try:
                # Initialize Supabase client
                supabase: Client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_ANON_KEY
                )

                # Verify the JWT token with Supabase
                user_response = supabase.auth.get_user(token)

                if user_response.user:
                    # Store Supabase user info in request
                    request.supabase_user = user_response.user
                    request.supabase_token = token

            except Exception:
                pass

        return None