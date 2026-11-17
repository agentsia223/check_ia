"""Copy each user's existing web history (Submission, ImageVerification) into
unlisted Check rows owned by the same user, keeping the original dates.

Legacy rows are left untouched (the mobile app still reads them) and no Fact is
copied (spec 13.1). The mappings are inlined so later changes to the service
code cannot change what this migration did.

Reverse is a no-op, so this migration is NOT re-runnable after a reverse:
migrating back past 0012 and forward again would copy the history a second
time and duplicate the Check rows.
"""
from urllib.parse import urlparse

from django.db import migrations

SAFE_ERROR_MESSAGE = (
    "L'analyse n'a pas pu être menée à terme en raison d'une erreur technique. "
    "Aucun verdict n'a été rendu. Veuillez réessayer."
)
MISSING_EXPLANATION = "Aucune explication détaillée n'est disponible pour cette analyse."

# Submission.statut → (state, verdict). 'en cours' rows will never finish in
# the new table, so they are copied as errors.
SUBMISSION_STATUS = {
    'vérifié': ('done', 'vrai'),
    'rejeté': ('done', 'faux'),
    'indéterminé': ('done', 'incertain'),
    'erreur': ('error', ''),
    'en cours': ('error', ''),
}
IMAGE_STATUS = {
    'VRAIE': ('done', 'vrai'),
    'FAUSSE': ('done', 'faux'),
    'INDÉTERMINÉE': ('done', 'incertain'),
    'INCERTAIN': ('done', 'incertain'),
    'IA_DÉTECTÉE': ('done', 'ia_detectee'),
    'AUTHENTIQUE': ('done', 'ia_non_detectee'),
    'ANALYSÉE': ('done', 'analyse'),
    'ERREUR': ('error', ''),
    'EN_COURS': ('error', ''),
}
BATCH_SIZE = 500


def _text(value, max_len):
    if value is None or isinstance(value, bool) or not isinstance(value, (str, int, float)):
        return ''
    return str(value).strip()[:max_len]


def _sources(raw):
    if not isinstance(raw, (list, tuple)):
        return []
    sources = []
    for item in raw:
        if isinstance(item, str):
            item = {'url': item}
        if not isinstance(item, dict):
            continue
        url = _text(item.get('url') or item.get('link'), 2000)
        if not url.lower().startswith(('http://', 'https://')):
            url = ''
        try:
            host = (urlparse(url).hostname or '').lower() if url else ''
        except ValueError:
            host = ''
        domain = host[4:] if host.startswith('www.') else host
        title = _text(item.get('title'), 300) or domain
        if not title and not url:
            continue
        sources.append({
            'title': title,
            'url': url,
            'domain': domain,
            'date': _text(item.get('date'), 50),
            'snippet': _text(item.get('snippet'), 1000),
        })
    return sources


def _explanation(state, text):
    if state == 'error':
        # Old error rows may hold raw exception text.
        return SAFE_ERROR_MESSAGE
    text = (text or '').strip()
    return text or MISSING_EXPLANATION


def copy_history_to_checks(apps, schema_editor):
    Check = apps.get_model('factcheck', 'Check')
    Submission = apps.get_model('factcheck', 'Submission')
    ImageVerification = apps.get_model('factcheck', 'ImageVerification')

    batch = []

    def flush():
        if batch:
            Check.objects.bulk_create(batch, batch_size=BATCH_SIZE)
            batch.clear()

    for submission in Submission.objects.all().order_by('pk').iterator(chunk_size=BATCH_SIZE):
        state, verdict = SUBMISSION_STATUS.get(submission.statut, ('done', 'incertain'))
        batch.append(Check(
            kind='text',
            claim=submission.texte or '',
            state=state,
            verdict=verdict,
            explanation=_explanation(state, submission.detailed_result),
            sources=_sources(submission.web_sources) if state == 'done' else [],
            confidence=None,
            listed=False,
            owner_id=submission.supabase_user_id,
            anon_token='',
            ip_hash='',
            created_at=submission.date,
            completed_at=submission.date,
        ))
        if len(batch) >= BATCH_SIZE:
            flush()

    for verification in ImageVerification.objects.all().order_by('pk').iterator(chunk_size=BATCH_SIZE):
        state, verdict = IMAGE_STATUS.get(verification.status, ('done', 'incertain'))
        is_content = verification.verification_type == 'content'
        batch.append(Check(
            kind='image_content' if is_content else 'image_ai',
            claim=(verification.claim_text or '') if is_content else '',
            image_url=verification.image_url or '',
            image_path=verification.image_path or '',
            state=state,
            verdict=verdict,
            explanation=_explanation(state, verification.explanation),
            sources=[],
            confidence=verification.confidence if state == 'done' else None,
            listed=False,
            owner_id=verification.supabase_user_id,
            anon_token='',
            ip_hash='',
            created_at=verification.date,
            completed_at=verification.date,
        ))
        if len(batch) >= BATCH_SIZE:
            flush()

    flush()


class Migration(migrations.Migration):

    dependencies = [
        ('factcheck', '0011_check_checkfeedback'),
    ]

    operations = [
        migrations.RunPython(copy_history_to_checks, migrations.RunPython.noop),
    ]
