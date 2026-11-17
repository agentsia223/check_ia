"""Public checks API (/api/checks/).

Views allow any caller and resolve identity themselves: a signed-in Supabase
user (owner) or an anonymous browser holding an X-Anon-Token. Every error is
`{"error": <French message>, "code": <slug>}`; raw exception text is never
returned.
"""
import logging
import uuid

from django.db.models import Q
from django.utils import timezone
from rest_framework import exceptions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import SupabaseAuthentication
from .models import Check, CheckFeedback, ImageVerification
from .services import checks as rules
from .services.keywords_extractor import extract_keywords
from .services.supabase_storage import delete_image_from_supabase, upload_image_to_supabase
from .tasks import SAFE_ANALYSIS_ERROR_MESSAGE, run_image_check, run_text_check

logger = logging.getLogger(__name__)

MSG_INVALID = "La requête est invalide."
MSG_NOT_FOUND = "Vérification introuvable."
MSG_FORBIDDEN = "Vous n'avez pas le droit de modifier cette vérification."
MSG_AUTH_REQUIRED = "Connectez-vous pour continuer."
MSG_SERVER_ERROR = "Une erreur technique est survenue. Veuillez réessayer."


def error_response(code, message, http_status):
    return Response({'error': message, 'code': code}, status=http_status)


def invalid(message=MSG_INVALID):
    return error_response('invalid', message, status.HTTP_400_BAD_REQUEST)


def auth_required():
    return error_response('auth_required', MSG_AUTH_REQUIRED, status.HTTP_401_UNAUTHORIZED)


def forbidden():
    return error_response('forbidden', MSG_FORBIDDEN, status.HTTP_403_FORBIDDEN)


def not_found():
    return error_response('not_found', MSG_NOT_FOUND, status.HTTP_404_NOT_FOUND)


def request_body(request):
    """request.data if it is an object (JSON object, form or multipart), else None."""
    data = request.data
    return data if isinstance(data, dict) else None


class TolerantSupabaseAuthentication(SupabaseAuthentication):
    """Supabase auth that treats a failed token as anonymous instead of 401.

    Used only by the public check operations, so a stale session never blocks
    reading a shared link. core/authentication.py is unchanged for every other
    endpoint.
    """

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except exceptions.AuthenticationFailed:
            return None


class ChecksAPIView(APIView):
    permission_classes = [AllowAny]
    # HTTP methods on which a failed Bearer token is treated as anonymous.
    tolerant_auth_methods = ()

    def uses_tolerant_auth(self, request):
        return request.method in self.tolerant_auth_methods

    def initialize_request(self, request, *args, **kwargs):
        # get_authenticators() takes no request, so decide here first.
        self._tolerant_auth = self.uses_tolerant_auth(request)
        return super().initialize_request(request, *args, **kwargs)

    def get_authenticators(self):
        if getattr(self, '_tolerant_auth', False):
            return [TolerantSupabaseAuthentication()]
        return super().get_authenticators()

    def handle_exception(self, exc):
        # Translate DRF and unexpected errors into the French error shape.
        if isinstance(exc, (exceptions.NotAuthenticated, exceptions.AuthenticationFailed)):
            return auth_required()
        if isinstance(exc, exceptions.MethodNotAllowed):
            return error_response('method_not_allowed', "Cette action n'est pas autorisée ici.",
                                  status.HTTP_405_METHOD_NOT_ALLOWED)
        if isinstance(exc, (exceptions.ParseError, exceptions.UnsupportedMediaType)):
            return invalid()
        if isinstance(exc, exceptions.APIException):
            return error_response('error', MSG_SERVER_ERROR, exc.status_code)
        logger.exception("Erreur inattendue dans l'API des vérifications")
        return error_response('server_error', MSG_SERVER_ERROR, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_check(self, public_id):
        return Check.objects.filter(public_id=public_id).first()


class CheckListCreateView(ChecksAPIView):
    def uses_tolerant_auth(self, request):
        # The library is public; `mine` (and create) keep strict auth.
        return request.method == 'GET' and request.GET.get('scope') != 'mine'

    def get(self, request):
        params = request.query_params
        scope = params.get('scope') or 'library'
        if scope not in ('library', 'mine'):
            return invalid("Portée de liste inconnue.")

        if scope == 'mine':
            user = rules.get_request_user(request)
            if user is None:
                return auth_required()
            queryset = Check.objects.filter(owner_id=user.id)
            rules.expire_stale_checks(queryset)
        else:
            queryset = Check.objects.filter(listed=True, state='done')

        query = (params.get('q') or '').strip()[:rules.SEARCH_MAX_CHARS]
        if query:
            queryset = queryset.filter(claim__icontains=query)

        verdict = params.get('verdict') or ''
        if verdict:
            if verdict not in rules.VERDICTS:
                return invalid("Verdict inconnu.")
            queryset = queryset.filter(verdict=verdict)

        try:
            page = int(params.get('page') or 1)
        except (TypeError, ValueError):
            return invalid("Numéro de page invalide.")
        if page < 1:
            return invalid("Numéro de page invalide.")

        count = queryset.count()
        start = (page - 1) * rules.PAGE_SIZE
        if start >= count:
            # Past the last page: never send a huge OFFSET to the database.
            results = []
        else:
            results = [rules.serialize_summary(c) for c in queryset[start:start + rules.PAGE_SIZE]]
        return Response({'count': count, 'page': page, 'page_size': rules.PAGE_SIZE, 'results': results})

    def post(self, request):
        user = rules.get_request_user(request)
        data = request_body(request)
        if data is None:
            return invalid()
        kind = data.get('kind')
        if kind not in rules.KINDS:
            return invalid("Type de vérification inconnu.")

        image = None
        if kind == 'text':
            text = data.get('text')
            if not isinstance(text, str) or not text.strip():
                return invalid("Le texte à vérifier ne peut pas être vide.")
            claim = text.strip()
            if len(claim) > rules.TEXT_MAX_CHARS:
                return invalid(f"Le texte ne doit pas dépasser {rules.TEXT_MAX_CHARS} caractères.")
        else:
            image = request.FILES.get('image')
            if image is None:
                return invalid("Aucune image fournie.")
            if image.size > rules.IMAGE_MAX_BYTES:
                return invalid("L'image ne doit pas dépasser 10 Mo.")
            image_type = rules.sniff_image_type(image)
            if image_type is None:
                return invalid("Format d'image non pris en charge. Utilisez une image JPEG, PNG ou WebP.")
            claim_text = data.get('claim_text') or ''
            if not isinstance(claim_text, str):
                return invalid()
            claim_text = claim_text.strip()
            if len(claim_text) > rules.TEXT_MAX_CHARS:
                return invalid(f"La description ne doit pas dépasser {rules.TEXT_MAX_CHARS} caractères.")
            # AI detection ignores any claim, as the legacy endpoint does.
            claim = claim_text if kind == 'image_content' else ''

        ip_hash = rules.request_ip_hash(request)
        token = ''
        if user is None:
            token = rules.get_anon_token(request)
            if not token:
                return invalid("Jeton anonyme manquant ou invalide. Rechargez la page et réessayez.")
            if rules.anon_quota_reached(token):
                return error_response(
                    'anon_quota',
                    "Vous avez utilisé votre vérification gratuite. Créez un compte pour continuer.",
                    status.HTTP_403_FORBIDDEN,
                )
            if rules.anon_ip_cap_reached(ip_hash):
                return error_response(
                    'ip_cap',
                    "Trop de vérifications depuis cette connexion aujourd'hui. "
                    "Réessayez demain ou créez un compte.",
                    status.HTTP_429_TOO_MANY_REQUESTS,
                )

        image_url = image_path = ''
        if image is not None:
            image.name = f"{uuid.uuid4().hex}.{image_type}"
            verification_type = 'content' if kind == 'image_content' else 'ai_detection'
            upload = upload_image_to_supabase(image, str(user.id) if user else 'anonymous', verification_type)
            if not upload.get('success') or not upload.get('public_url'):
                logger.error(f"Échec de l'envoi de l'image vers le stockage: {upload.get('error')}")
                return error_response(
                    'upload_failed', "L'envoi de l'image a échoué. Veuillez réessayer.",
                    status.HTTP_502_BAD_GATEWAY,
                )
            image_url, image_path = upload['public_url'], upload.get('file_path') or ''

        check = Check.objects.create(
            kind=kind,
            claim=claim,
            image_url=image_url,
            image_path=image_path,
            owner_id=user.id if user else None,
            anon_token=token,
            ip_hash=ip_hash,
        )

        task = run_text_check if kind == 'text' else run_image_check
        try:
            task.delay(check.pk)
        except Exception:
            logger.exception(f"Impossible de mettre en file le check {check.pk}")
            Check.objects.filter(pk=check.pk, state='running').update(
                state='error', explanation=SAFE_ANALYSIS_ERROR_MESSAGE, completed_at=timezone.now(),
            )

        check.refresh_from_db()
        return Response(rules.serialize_check(check, request), status=status.HTTP_201_CREATED)


class CheckDetailView(ChecksAPIView):
    # GET is public; PATCH and DELETE keep strict auth (401 on a bad token).
    tolerant_auth_methods = ('GET',)

    def get(self, request, public_id):
        check = self.get_check(public_id)
        if check is None:
            return not_found()
        if rules.expire_stale_checks(Check.objects.filter(pk=check.pk)):
            check.refresh_from_db()
        return Response(rules.serialize_check(check, request))

    def _owned_check(self, request, public_id):
        """(check, None) for the signed-in owner, else (None, error response)."""
        check = self.get_check(public_id)
        if check is None:
            return None, not_found()
        user = rules.get_request_user(request)
        if user is None:
            return None, auth_required()
        if not rules.is_owner_user(user, check):
            return None, forbidden()
        return check, None

    def patch(self, request, public_id):
        check, error = self._owned_check(request, public_id)
        if error:
            return error
        data = request_body(request)
        listed = data.get('listed') if data is not None else None
        if not isinstance(listed, bool):
            return invalid("Le champ « listed » doit valoir true ou false.")
        if listed and not (check.state == 'done' and check.verdict in rules.LISTABLE_VERDICTS):
            return error_response(
                'not_listable',
                "Seule une vérification terminée avec un verdict peut être publiée dans la bibliothèque.",
                status.HTTP_400_BAD_REQUEST,
            )
        check.listed = listed
        check.save(update_fields=['listed'])
        return Response(rules.serialize_check(check, request))

    def delete(self, request, public_id):
        check, error = self._owned_check(request, public_id)
        if error:
            return error
        image_path = check.image_path
        check.delete()
        # Copied history shares its image with the legacy record the mobile app shows.
        if image_path and not ImageVerification.objects.filter(image_path=image_path).exists():
            try:
                result = delete_image_from_supabase(image_path)
                if not result.get('success'):
                    logger.warning(f"Image non supprimée du stockage: {result.get('error')}")
            except Exception:
                logger.exception("Erreur lors de la suppression de l'image du stockage")
        return Response(status=status.HTTP_204_NO_CONTENT)


class CheckCancelView(ChecksAPIView):
    def post(self, request, public_id):
        check = self.get_check(public_id)
        if check is None:
            return not_found()
        if not rules.is_owner(request, check):
            return forbidden()
        updated = Check.objects.filter(pk=check.pk, state='running').update(
            state='cancelled', verdict='', completed_at=timezone.now(),
        )
        if not updated:
            return error_response('not_running', "Cette vérification n'est plus en cours.",
                                  status.HTTP_409_CONFLICT)
        check.refresh_from_db()
        return Response(rules.serialize_check(check, request))


class CheckFeedbackView(ChecksAPIView):
    tolerant_auth_methods = ('POST',)

    def post(self, request, public_id):
        check = self.get_check(public_id)
        if check is None:
            return not_found()
        data = request_body(request)
        if data is None:
            return invalid()
        helpful = data.get('helpful')
        message = data.get('message')
        if helpful is not None and not isinstance(helpful, bool):
            return invalid("Le champ « helpful » doit valoir true, false ou null.")
        if message is None:
            message = ''
        if not isinstance(message, str):
            return invalid()
        message = message.strip()
        if len(message) > rules.FEEDBACK_MAX_CHARS:
            return invalid(f"Le message ne doit pas dépasser {rules.FEEDBACK_MAX_CHARS} caractères.")
        if helpful is None and not message:
            return invalid("Indiquez si la réponse vous a aidé ou écrivez un message.")

        ip_hash = rules.request_ip_hash(request)
        if rules.feedback_ip_cap_reached(ip_hash):
            return error_response('ip_cap', "Trop d'avis envoyés depuis cette connexion aujourd'hui. Merci !",
                                  status.HTTP_429_TOO_MANY_REQUESTS)
        CheckFeedback.objects.create(check_ref=check, helpful=helpful, message=message, ip_hash=ip_hash)
        return Response({'ok': True}, status=status.HTTP_201_CREATED)


class CheckRelatedView(ChecksAPIView):
    tolerant_auth_methods = ('GET',)

    def get(self, request, public_id):
        check = self.get_check(public_id)
        if check is None:
            return not_found()
        try:
            keywords = extract_keywords(check.claim) if check.claim else []
        except Exception:
            logger.exception("Extraction des mots-clés impossible")
            keywords = []
        keywords = [k.strip() for k in keywords or [] if isinstance(k, str) and k.strip()]
        if not keywords:
            return Response([])

        match = Q()
        for keyword in keywords:
            match |= Q(claim__icontains=keyword)
        related = (
            Check.objects.filter(listed=True, state='done')
            .exclude(pk=check.pk)
            .filter(match)[:rules.RELATED_LIMIT]
        )
        return Response([rules.serialize_summary(c) for c in related])


class CheckClaimView(ChecksAPIView):
    def post(self, request):
        user = rules.get_request_user(request)
        if user is None:
            return auth_required()
        token = rules.get_anon_token(request)
        if not token:
            return Response({'claimed': 0})
        claimed = Check.objects.filter(anon_token=token, owner_id__isnull=True).update(
            owner_id=user.id, anon_token='',
        )
        return Response({'claimed': claimed})
