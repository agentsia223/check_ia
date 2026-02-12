from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from core.models import Fact, Submission, VerifiedMedia, Keyword, ImageVerification
from core.serializers import FactSerializer, SubmissionSerializer, VerifiedMediaSerializer, KeywordSerializer
from django.http import HttpResponse, JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .services.keywords_extractor import extract_keywords
from deep_translator import GoogleTranslator
from django.conf import settings
from supabase import create_client, Client
import json
from .services.ai_analysis import analyze_text
from .services.image_verification import verify_image_content, detect_ai_generated_image
from .services.supabase_storage import upload_image_to_supabase, create_bucket_if_not_exists
import logging

logger = logging.getLogger(__name__)



class FactViewSet(viewsets.ModelViewSet):
    queryset = Fact.objects.all().order_by('-date')  # Tri par date de création en ordre décroissant (LIFO)
    serializer_class = FactSerializer
    permission_classes = [IsAuthenticated]


class KeywordViewSet(viewsets.ModelViewSet):
    queryset = Keyword.objects.all()
    serializer_class = KeywordSerializer
    permission_classes = [IsAuthenticated]


@method_decorator(csrf_exempt, name='dispatch')
class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            logger.info("=== NOUVELLE SOUMISSION DE VÉRIFICATION ===")
            
            # Get user information from the authenticated request
            user = request.user
            logger.info(f"Utilisateur authentifié: {user.email}")
            
            # Extract data from request
            texte = request.data.get('texte', '')
            source = request.data.get('source', '')
            
            logger.info(f"Texte à analyser: {texte}")
            logger.info(f"Source fournie: {source}")
            
            if not texte.strip():
                return Response(
                    {"error": "Le texte ne peut pas être vide"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create submission with "en cours" status
            submission = Submission.objects.create(
                supabase_user_id=user.id,
                user_email=user.email,
                user_name=getattr(user, 'user_metadata', {}).get('full_name', ''),
                texte=texte,
                source=source,
                statut='en cours',  # Statut initial
                web_sources=None,
                detailed_result='Analyse en cours...'
            )
            
            logger.info(f"Soumission créée avec ID: {submission.id}")
            
            # Launch async analysis task
            from .tasks import analyze_submission_text_task
            task_result = analyze_submission_text_task.delay(submission.id, texte)
            
            logger.info(f"Tâche Celery lancée - Task ID: {task_result.id}")
            logger.info("=== SOUMISSION CRÉÉE - ANALYSE EN COURS ===")
            
            # Return the submission with "en cours" status
            serializer = self.get_serializer(submission)
            response_data = serializer.data
            response_data['task_id'] = task_result.id  # Include task ID for tracking
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Erreur lors de la création de la soumission: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {"error": f"Une erreur s'est produite: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_queryset(self):
        # Filter submissions by authenticated user
        user = self.request.user
        return Submission.objects.filter(supabase_user_id=user.id)


class VerifiedMediaViewSet(viewsets.ModelViewSet):
    queryset = VerifiedMedia.objects.all()
    serializer_class = VerifiedMediaSerializer
    permission_classes = [IsAuthenticated]


# Supabase Auth Views
@api_view(['POST'])
@permission_classes([AllowAny])
def supabase_login(request):
    """
    Handle login with Supabase
    """
    try:
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({'error': 'Email and password are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Initialize Supabase client
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        
        # Sign in with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if auth_response.user:
            return Response({
                'access_token': auth_response.session.access_token,
                'refresh_token': auth_response.session.refresh_token,
                'user': {
                    'id': auth_response.user.id,
                    'email': auth_response.user.email,
                    'user_metadata': auth_response.user.user_metadata
                }
            })
        else:
            return Response({'error': 'Invalid credentials'}, 
                          status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def supabase_register(request):
    """
    Handle registration with Supabase
    """
    try:
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        if not email or not password:
            return Response({'error': 'Email and password are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Initialize Supabase client
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        
        # Sign up with Supabase
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "first_name": first_name,
                    "last_name": last_name
                }
            }
        })
        
        if auth_response.user:
            return Response({
                'message': 'Registration successful. Please check your email for verification.',
                'user': {
                    'id': auth_response.user.id,
                    'email': auth_response.user.email
                }
            })
        else:
            return Response({'error': 'Registration failed'}, 
                          status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def supabase_logout(request):
    """
    Handle logout with Supabase
    """
    try:
        # Initialize Supabase client
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        
        # Sign out from Supabase
        supabase.auth.sign_out()
        
        return Response({'message': 'Logout successful'})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supabase_user(request):
    """
    Get current user information
    """
    try:
        return Response({
            'user': {
                'id': request.user.id,
                'email': request.user.email,
                'user_metadata': request.user.user_metadata
            }
        })
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


def home(request):
    return HttpResponse("Hello, world. You're at the Check-IA API.")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_image_content_view(request):
    """
    API endpoint for image content verification - Using Celery async tasks
    """
    try:
        logger.info("=== NOUVELLE VÉRIFICATION D'IMAGE ASYNC ===")
        
        # Get user information
        user = request.user
        logger.info(f"Utilisateur authentifié: {user.email}")
        
        # Extract data from request
        image_file = request.FILES.get('image')
        claim_text = request.data.get('claim_text', '')
        
        if not image_file:
            return Response(
                {"error": "Aucune image fournie"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"Image reçue: {image_file.name}")
        logger.info(f"Affirmation: {claim_text}")
        
        # Read image data
        image_data = image_file.read()
        
        # Launch async upload and verification task
        from .tasks import upload_and_verify_image_task
        task_result = upload_and_verify_image_task.delay(
            str(user.id),
            user.email,
            getattr(user, 'user_metadata', {}).get('full_name', ''),
            image_data,
            image_file.name,
            claim_text,
            'content'
        )
        
        logger.info(f"Tâche de vérification d'image lancée - Task ID: {task_result.id}")
        
        return Response({
            'message': 'Vérification d\'image lancée',
            'task_id': task_result.id,
            'status': 'EN_COURS'
        }, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        logger.error(f"Erreur lors de la vérification d'image: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response(
            {"error": f"Une erreur s'est produite: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def detect_ai_image_view(request):
    """
    API endpoint for detecting AI-generated images - Using Celery async tasks
    """
    try:
        logger.info("=== NOUVELLE DÉTECTION D'IMAGE IA ASYNC ===")
        
        # Get user information
        user = request.user
        logger.info(f"Utilisateur authentifié: {user.email}")
        
        # Extract data from request
        image_file = request.FILES.get('image')
        
        if not image_file:
            return Response(
                {"error": "Aucune image fournie"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"Image reçue pour détection IA: {image_file.name}")
        
        # Read image data
        image_data = image_file.read()
        
        # Launch async upload and detection task
        from .tasks import upload_and_verify_image_task
        task_result = upload_and_verify_image_task.delay(
            str(user.id),
            user.email,
            getattr(user, 'user_metadata', {}).get('full_name', ''),
            image_data,
            image_file.name,
            '',  # No claim for AI detection
            'ai_detection'
        )
        
        logger.info(f"Tâche de détection IA lancée - Task ID: {task_result.id}")
        
        return Response({
            'message': 'Détection IA lancée',
            'task_id': task_result.id,
            'status': 'EN_COURS'
        }, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        logger.error(f"Erreur lors de la détection IA: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response(
            {"error": f"Une erreur s'est produite: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_image_verifications_view(request):
    """
    API endpoint to get user's image verification history
    """
    try:
        user = request.user
        verifications = ImageVerification.objects.filter(supabase_user_id=user.id)
        
        verification_data = []
        for verification in verifications:
            verification_data.append({
                'id': verification.id,
                'verification_type': verification.verification_type,
                'claim_text': verification.claim_text,
                'status': verification.status,
                'explanation': verification.explanation,
                'confidence': verification.confidence,
                'date': verification.date,
                'image_url': verification.image_url,
                'original_filename': verification.original_filename
            })
        
        return Response(verification_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des vérifications: {e}")
        return Response(
            {"error": f"Une erreur s'est produite: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_task_status_view(request, task_id):
    """
    API endpoint to check the status of a Celery task
    """
    try:
        from celery.result import AsyncResult
        
        # Get task result
        task_result = AsyncResult(task_id)
        
        if task_result.state == 'PENDING':
            response = {
                'state': task_result.state,
                'status': 'EN_COURS',
                'message': 'Tâche en cours...'
            }
        elif task_result.state == 'SUCCESS':
            result = task_result.result
            if result and isinstance(result, dict):
                response = {
                    'state': task_result.state,
                    'status': 'TERMINÉ',
                    'result': result
                }
            else:
                response = {
                    'state': task_result.state,
                    'status': 'TERMINÉ',
                    'message': 'Tâche terminée avec succès'
                }
        elif task_result.state == 'FAILURE':
            response = {
                'state': task_result.state,
                'status': 'ERREUR',
                'error': str(task_result.info)
            }
        else:
            response = {
                'state': task_result.state,
                'status': task_result.state,
                'message': f'État de la tâche: {task_result.state}'
            }
        
        return Response(response, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Erreur lors de la vérification du statut de la tâche: {e}")
        return Response(
            {"error": f"Une erreur s'est produite: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
