"""Rules for the public checks API: verdict mapping, sources, identity, quotas
and serialisation. Kept free of HTTP concerns so tasks and views share them.
"""
import hashlib
import hmac
import re
from datetime import timedelta
from urllib.parse import urlparse

from django.conf import settings
from django.utils import timezone

# Quotas -------------------------------------------------------------------
ANON_FREE_CHECKS = 1
ANON_IP_DAILY_CAP = 5
FEEDBACK_IP_DAILY_CAP = 20
RUNNING_TIMEOUT_SECONDS = 300

# Input limits -------------------------------------------------------------
TEXT_MAX_CHARS = 1000
FEEDBACK_MAX_CHARS = 1000
IMAGE_MAX_BYTES = 10 * 1024 * 1024
SEARCH_MAX_CHARS = 200
SUMMARY_CLAIM_MAX_CHARS = 200
PAGE_SIZE = 20
RELATED_LIMIT = 3
ANON_TOKEN_PATTERN = re.compile(r'^[A-Za-z0-9_-]{16,128}$')

KINDS = ('text', 'image_content', 'image_ai')
VERDICTS = ('vrai', 'faux', 'incertain', 'ia_detectee', 'ia_non_detectee', 'analyse')
LISTABLE_VERDICTS = ('vrai', 'faux', 'incertain', 'ia_detectee', 'ia_non_detectee')

CHECK_TIMEOUT_MESSAGE = (
    "L'analyse a pris trop de temps et a été interrompue. "
    "Aucun verdict n'a été rendu. Veuillez réessayer."
)
MISSING_EXPLANATION_MESSAGE = "Aucune explication détaillée n'est disponible pour cette analyse."

# Verdict mapping ------------------------------------------------------------
_TEXT_STATUS_MAP = {
    'VRAIE': ('done', 'vrai'),
    'FAUSSE': ('done', 'faux'),
    'INDÉTERMINÉE': ('done', 'incertain'),
    'ERREUR': ('error', ''),
}
_IMAGE_STATUS_MAP = {
    'VRAIE': ('done', 'vrai'),
    'FAUSSE': ('done', 'faux'),
    'INDÉTERMINÉE': ('done', 'incertain'),
    'INCERTAIN': ('done', 'incertain'),
    'IA_DÉTECTÉE': ('done', 'ia_detectee'),
    'AUTHENTIQUE': ('done', 'ia_non_detectee'),
    'ANALYSÉE': ('done', 'analyse'),
    'ERREUR': ('error', ''),
}


def map_text_status(statut):
    """Map analyze_text's `statut` to (state, verdict). Unknown → (done, incertain)."""
    return _TEXT_STATUS_MAP.get(statut, ('done', 'incertain'))


def map_image_status(statut):
    """Map an image service `statut` to (state, verdict). Unknown → (done, incertain)."""
    return _IMAGE_STATUS_MAP.get(statut, ('done', 'incertain'))


# Sources ------------------------------------------------------------------
def _clean_text(value, max_len):
    if value is None or isinstance(value, bool) or not isinstance(value, (str, int, float)):
        return ''
    return str(value).strip()[:max_len]


def _clean_url(value):
    url = _clean_text(value, 2000)
    # Only web links are rendered; anything else (javascript:, data:…) is dropped.
    if not url.lower().startswith(('http://', 'https://')):
        return ''
    return url


def _domain_of(url):
    if not url:
        return ''
    try:
        host = (urlparse(url).hostname or '').lower()
    except ValueError:
        return ''
    return host[4:] if host.startswith('www.') else host


def normalize_sources(raw):
    """Return a list of {title, url, domain, date, snippet} dicts.

    Tolerates None, non-list input, non-dict items and missing keys. Items with
    neither a title nor a usable URL are dropped. Bare URL strings are kept.
    """
    if not isinstance(raw, (list, tuple)):
        return []
    sources = []
    for item in raw:
        if isinstance(item, str):
            item = {'url': item}
        if not isinstance(item, dict):
            continue
        url = _clean_url(item.get('url') or item.get('link'))
        domain = _domain_of(url)
        title = _clean_text(item.get('title'), 300) or domain
        if not title and not url:
            continue
        sources.append({
            'title': title,
            'url': url,
            'domain': domain,
            'date': _clean_text(item.get('date'), 50),
            'snippet': _clean_text(item.get('snippet'), 1000),
        })
    return sources


# Identity -----------------------------------------------------------------
def get_request_user(request):
    """The signed-in Supabase user, or None. Never raises for anonymous requests."""
    user = getattr(request, 'user', None)
    if user is None or not getattr(user, 'is_authenticated', False) or not getattr(user, 'id', None):
        return None
    return user


def get_anon_token(request):
    """The request's X-Anon-Token if well formed (16–128 url-safe chars), else ''."""
    token = (request.headers.get('X-Anon-Token') or '').strip()
    return token if ANON_TOKEN_PATTERN.match(token) else ''


def is_owner_user(user, check):
    return bool(user and check.owner_id and str(user.id) == str(check.owner_id))


def is_anon_holder(token, check):
    return bool(token and check.anon_token and hmac.compare_digest(token, check.anon_token))


def is_owner(request, check):
    return is_owner_user(get_request_user(request), check) or is_anon_holder(get_anon_token(request), check)


# IP hashing -----------------------------------------------------------------
def _trusted_proxy_count():
    try:
        return max(1, int(getattr(settings, 'CHECKS_TRUSTED_PROXY_COUNT', 1)))
    except (TypeError, ValueError):
        return 1


def client_ip(request):
    """Client IP used for the per-IP caps.

    Order: X-Real-IP if CHECKS_TRUST_X_REAL_IP is on and the header is
    non-empty (off by default: a client can send its own X-Real-IP unless the
    host overwrites it); else the X-Forwarded-For entry
    CHECKS_TRUSTED_PROXY_COUNT positions from the right (1 = last hop, the one
    the nearest proxy appended; entries further left are client-supplied and
    spoofable; a shorter list falls back to its first entry); else REMOTE_ADDR.

    DEPLOY: only turn CHECKS_TRUST_X_REAL_IP on once the host is confirmed to
    overwrite a client-sent X-Real-IP. CHECKS_TRUSTED_PROXY_COUNT must be
    confirmed against the hosting proxy chain (Railway alone = 1; add one per
    CDN/proxy in front). A wrong value either lets clients spoof their IP or
    makes all visitors share one cap.
    """
    if getattr(settings, 'CHECKS_TRUST_X_REAL_IP', False):
        real_ip = (request.META.get('HTTP_X_REAL_IP') or '').strip()
        if real_ip:
            return real_ip
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    hops = [hop.strip() for hop in forwarded.split(',') if hop.strip()]
    if hops:
        count = _trusted_proxy_count()
        return hops[-count] if count <= len(hops) else hops[0]
    return request.META.get('REMOTE_ADDR', '') or ''


def hash_ip(ip):
    """Salted SHA-256 of an IP address; the raw IP is never stored."""
    salt = getattr(settings, 'CHECKS_IP_HASH_SALT', '') or settings.SECRET_KEY
    return hashlib.sha256(f'{salt}:{ip}'.encode('utf-8')).hexdigest()


def request_ip_hash(request):
    return hash_ip(client_ip(request))


# Quotas -------------------------------------------------------------------
def _start_of_today():
    return timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)


def expire_stale_checks(queryset):
    """Save checks still running after RUNNING_TIMEOUT_SECONDS as errors."""
    cutoff = timezone.now() - timedelta(seconds=RUNNING_TIMEOUT_SECONDS)
    return queryset.filter(state='running', created_at__lt=cutoff).update(
        state='error', verdict='', explanation=CHECK_TIMEOUT_MESSAGE, completed_at=timezone.now(),
    )


def anon_quota_reached(token):
    from core.models import Check

    tokens_checks = Check.objects.filter(anon_token=token)
    expire_stale_checks(tokens_checks)
    return tokens_checks.filter(state__in=('running', 'done')).count() >= ANON_FREE_CHECKS


def anon_ip_cap_reached(ip_hash):
    from core.models import Check

    count = Check.objects.filter(
        owner_id__isnull=True, ip_hash=ip_hash, created_at__gte=_start_of_today()
    ).count()
    return count >= ANON_IP_DAILY_CAP


def feedback_ip_cap_reached(ip_hash):
    from core.models import CheckFeedback

    count = CheckFeedback.objects.filter(ip_hash=ip_hash, created_at__gte=_start_of_today()).count()
    return count >= FEEDBACK_IP_DAILY_CAP


# Image validation -----------------------------------------------------------
def sniff_image_type(image_file):
    """Return 'jpeg', 'png' or 'webp' from the file's magic bytes, else None."""
    try:
        image_file.seek(0)
        head = image_file.read(12)
        image_file.seek(0)
    except Exception:
        return None
    if head[:3] == b'\xff\xd8\xff':
        return 'jpeg'
    if head[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return 'webp'
    return None


# Serialisation ----------------------------------------------------------------
def _iso(value):
    return value.isoformat() if value else None


def serialize_check(check, request):
    """Public Check JSON. Never includes owner id, email, token, IP hash or storage path."""
    return {
        'id': check.public_id,
        'kind': check.kind,
        'claim': check.claim,
        'image_url': check.image_url or '',
        'state': check.state,
        'verdict': check.verdict or None,
        'explanation': check.explanation,
        'sources': normalize_sources(check.sources),
        'confidence': check.confidence,
        'created_at': _iso(check.created_at),
        'completed_at': _iso(check.completed_at),
        'listed': check.listed,
        'is_owner': is_owner(request, check),
    }


def serialize_summary(check):
    claim = check.claim or ''
    if len(claim) > SUMMARY_CLAIM_MAX_CHARS:
        claim = claim[:SUMMARY_CLAIM_MAX_CHARS - 1].rstrip() + '…'
    return {
        'id': check.public_id,
        'kind': check.kind,
        'claim': claim,
        'state': check.state,
        'verdict': check.verdict or None,
        'source_count': len(check.sources) if isinstance(check.sources, list) else 0,
        'created_at': _iso(check.created_at),
        'listed': check.listed,
    }
