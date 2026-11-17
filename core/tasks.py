# factcheck/tasks.py

from celery import shared_task
from .services.ai_analysis import analyze_text
from .services.image_verification import verify_image_content, detect_ai_generated_image
from .services.supabase_storage import upload_image_to_supabase, create_bucket_if_not_exists
import logging

logger = logging.getLogger(__name__)

SAFE_ANALYSIS_ERROR_MESSAGE = (
    "L'analyse n'a pas pu être menée à terme en raison d'une erreur technique. "
    "Aucun verdict n'a été rendu. Veuillez réessayer."
)

@shared_task
def analyze_submission_text_task(submission_id, text):
    """
    Tâche asynchrone pour analyser le texte d'une soumission
    """
    try:
        from .models import Submission
        
        logger.info(f"=== DÉBUT ANALYSE CELERY - Soumission {submission_id} ===")
        
        # Récupérer la soumission
        submission = Submission.objects.get(id=submission_id)
        logger.info(f"Soumission trouvée: {submission.texte[:50]}...")
        
        # Effectuer l'analyse
        analysis_result, web_sources = analyze_text(text)
        logger.info(f"Analyse terminée. Type de résultat: {type(analysis_result)}")
        
        # Traiter le résultat
        if isinstance(analysis_result, dict):
            ai_status = analysis_result.get('statut', 'INDÉTERMINÉE')
            explanation = analysis_result.get('explication', 'Pas d\'explication disponible')
            
            # Mapping du statut
            status_mapping = {
                'VRAIE': 'vérifié',
                'FAUSSE': 'rejeté',
                'INDÉTERMINÉE': 'indéterminé',
                'ERREUR': 'erreur',
            }
            final_status = status_mapping.get(ai_status, 'indéterminé')

            if ai_status == 'ERREUR':
                # analyze_text swallowed its own exception and returned a
                # success-shaped dict whose 'explication' embeds raw exception
                # text. Never persist that to the user-facing record — log it
                # and store the safe generic message instead.
                logger.error(
                    f"Analyse retournée avec statut ERREUR pour la soumission {submission_id}: {explanation}"
                )
                explanation = SAFE_ANALYSIS_ERROR_MESSAGE

        else:
            # Format legacy
            ai_status = 'LEGACY'
            final_status = analysis_result
            explanation = f"Résultat d'analyse: {analysis_result}"
        
        # Mettre à jour la soumission
        submission.statut = final_status
        submission.web_sources = web_sources
        submission.detailed_result = explanation
        submission.save()
        
        # Si le fait est vérifié comme VRAI, l'ajouter à la bibliothèque des faits vérifiés
        if ai_status == 'VRAIE' and final_status == 'vérifié':
            try:
                from .models import Fact
                from .services.keywords_extractor import extract_keywords
                
                # Déterminer la source principale à utiliser
                primary_source = ''
                logger.info(f"Détermination de la source principale - Analysis result type: {type(analysis_result)}")
                
                if isinstance(analysis_result, dict):
                    # Essayer d'utiliser les sources principales de l'analyse AI
                    sources_principales = analysis_result.get('sources_principales', [])
                    logger.info(f"Sources principales trouvées: {sources_principales}")
                    
                    if sources_principales and isinstance(sources_principales, list):
                        primary_source = sources_principales[0]
                        logger.info(f"Source principale sélectionnée depuis analysis_result: {primary_source}")
                    # Sinon, essayer d'extraire de web_sources
                    elif web_sources and isinstance(web_sources, list) and len(web_sources) > 0:
                        primary_source = web_sources[0].get('url', '') if isinstance(web_sources[0], dict) else str(web_sources[0])
                        logger.info(f"Source principale sélectionnée depuis web_sources: {primary_source}")
                
                # Si aucune source de vérification, utiliser la source soumise
                if not primary_source:
                    primary_source = submission.source or 'Source de vérification non disponible'
                    logger.info(f"Aucune source de vérification trouvée, utilisation par défaut: {primary_source}")
                
                logger.info(f"Source finale pour la bibliothèque: {primary_source}")
                
                # Créer le fait vérifié
                fact = Fact.objects.create(
                    texte=submission.texte,
                    source=primary_source,
                    web_sources=web_sources
                )
                
                # Extraire et associer les mots-clés
                keywords = extract_keywords(submission.texte)
                if keywords:
                    from .models import Keyword
                    for keyword_text in keywords:
                        keyword, created = Keyword.objects.get_or_create(mot=keyword_text.lower())
                        fact.mots_cles.add(keyword)
                
                logger.info(f"Fait vérifié ajouté à la bibliothèque - ID: {fact.id}")
                
            except Exception as e:
                logger.error(f"Erreur lors de l'ajout du fait à la bibliothèque: {e}")
                # Ne pas faire échouer la tâche pour cette erreur
        
        logger.info(f"=== ANALYSE CELERY TERMINÉE - Soumission {submission_id} ===")
        logger.info(f"Statut final: {final_status}")
        
        return {
            'success': True,
            'submission_id': submission_id,
            'status': final_status,
            'explanation': explanation[:100] + '...' if len(explanation) > 100 else explanation
        }
        
    except Exception as e:
        logger.error(f"Erreur dans analyze_submission_text_task: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Marquer la soumission comme erreur (jamais comme un verdict)
        try:
            submission = Submission.objects.get(id=submission_id)
            submission.statut = 'erreur'
            submission.detailed_result = SAFE_ANALYSIS_ERROR_MESSAGE
            submission.save()
        except Exception:
            pass
            
        return {
            'success': False,
            'submission_id': submission_id,
            'error': str(e)
        }


@shared_task
def verify_image_content_task(verification_id, image_url, claim_text=""):
    """
    Tâche asynchrone pour vérifier le contenu d'une image
    """
    try:
        from .models import ImageVerification
        
        logger.info(f"=== DÉBUT VÉRIFICATION IMAGE CELERY - ID {verification_id} ===")
        
        # Récupérer la vérification
        image_verification = ImageVerification.objects.get(id=verification_id)
        logger.info(f"Vérification trouvée: {image_verification.original_filename}")
        
        # Effectuer la vérification
        verification_result = verify_image_content(image_url, claim_text)
        
        if verification_result['statut'] == 'ERREUR':
            # Marquer comme erreur
            image_verification.status = 'ERREUR'
            image_verification.explanation = verification_result['explication']
            image_verification.confidence = 0
            image_verification.save()
            
            return {
                'success': False,
                'verification_id': verification_id,
                'error': verification_result['explication']
            }
        
        # Mettre à jour la vérification
        image_verification.status = verification_result['statut']
        image_verification.explanation = verification_result['explication']
        image_verification.confidence = verification_result['confidence']
        image_verification.details = verification_result['details']
        image_verification.model_used = verification_result.get('details', {}).get('model', 'openai/gpt-4.1-mini')
        image_verification.save()

        logger.info(f"=== VÉRIFICATION IMAGE CELERY TERMINÉE - ID {verification_id} ===")
        logger.info(f"Statut: {verification_result['statut']}, Confiance: {verification_result['confidence']}%")
        
        return {
            'success': True,
            'verification_id': verification_id,
            'status': verification_result['statut'],
            'confidence': verification_result['confidence'],
            'explanation': verification_result['explication'],
            'details': verification_result['details'],
            'date': image_verification.date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erreur dans verify_image_content_task: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Marquer comme erreur
        try:
            image_verification = ImageVerification.objects.get(id=verification_id)
            image_verification.status = 'ERREUR'
            image_verification.explanation = f'Erreur lors de la vérification: {str(e)}'
            image_verification.confidence = 0
            image_verification.save()
        except:
            pass
            
        return {
            'success': False,
            'verification_id': verification_id,
            'error': str(e)
        }


@shared_task
def detect_ai_image_task(verification_id, image_url):
    """
    Tâche asynchrone pour détecter si une image est générée par IA
    """
    try:
        from .models import ImageVerification
        
        logger.info(f"=== DÉBUT DÉTECTION IA CELERY - ID {verification_id} ===")
        
        # Récupérer la vérification
        image_verification = ImageVerification.objects.get(id=verification_id)
        logger.info(f"Détection IA trouvée: {image_verification.original_filename}")
        
        # Effectuer la détection
        detection_result = detect_ai_generated_image(image_url)
        
        if detection_result['statut'] == 'ERREUR':
            # Marquer comme erreur
            image_verification.status = 'ERREUR'
            image_verification.explanation = detection_result['explication']
            image_verification.confidence = 0
            image_verification.save()
            
            return {
                'success': False,
                'verification_id': verification_id,
                'error': detection_result['explication']
            }
        
        # Mettre à jour la vérification
        image_verification.status = detection_result['statut']
        image_verification.explanation = detection_result['explication']
        image_verification.confidence = detection_result['confidence']
        image_verification.details = detection_result['details']
        image_verification.model_used = detection_result.get('details', {}).get('model', 'openai/gpt-4.1-mini')
        image_verification.save()

        logger.info(f"=== DÉTECTION IA CELERY TERMINÉE - ID {verification_id} ===")
        logger.info(f"Statut: {detection_result['statut']}, Confiance: {detection_result['confidence']}%")

        return {
            'success': True,
            'verification_id': verification_id,
            'status': detection_result['statut'],
            'confidence': detection_result['confidence'],
            'explanation': detection_result['explication'],
            'details': detection_result['details'],
            'date': image_verification.date.isoformat()
        }

    except Exception as e:
        logger.error(f"Erreur dans detect_ai_image_task: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Marquer comme erreur
        try:
            image_verification = ImageVerification.objects.get(id=verification_id)
            image_verification.status = 'ERREUR'
            image_verification.explanation = f'Erreur lors de la détection: {str(e)}'
            image_verification.confidence = 0
            image_verification.save()
        except:
            pass
            
        return {
            'success': False,
            'verification_id': verification_id,
            'error': str(e)
        }


@shared_task
def upload_and_verify_image_task(user_id, user_email, user_name, image_data, image_name, claim_text, verification_type):
    """
    Tâche asynchrone complète pour uploader et vérifier une image
    """
    try:
        from .models import ImageVerification
        from django.core.files.base import ContentFile
        
        logger.info(f"=== DÉBUT UPLOAD ET VÉRIFICATION CELERY ===")
        logger.info(f"Utilisateur: {user_email}, Type: {verification_type}")
        
        # Créer un objet fichier depuis les données
        image_file = ContentFile(image_data, name=image_name)
        
        # Vérifier/créer le bucket
        bucket_result = create_bucket_if_not_exists()
        if not bucket_result["success"]:
            logger.error(f"Erreur création bucket: {bucket_result.get('error')}")
        
        # Upload vers Supabase
        upload_result = upload_image_to_supabase(image_file, user_id, verification_type)
        
        if not upload_result["success"]:
            return {
                'success': False,
                'error': f'Erreur lors de l\'upload: {upload_result.get("error")}'
            }
        
        # Créer l'enregistrement de vérification
        image_verification = ImageVerification.objects.create(
            supabase_user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            image_path=upload_result['file_path'],
            image_url=upload_result['public_url'],
            original_filename=image_name,
            claim_text=claim_text,
            verification_type=verification_type,
            status='EN_COURS',  # Statut temporaire
            explanation='Analyse en cours...',
            confidence=0
        )
        
        # Lancer la tâche de vérification appropriée
        if verification_type == 'content':
            task_result = verify_image_content_task.delay(
                image_verification.id, 
                upload_result['public_url'], 
                claim_text
            )
        else:  # ai_detection
            task_result = detect_ai_image_task.delay(
                image_verification.id, 
                upload_result['public_url']
            )
        
        logger.info(f"=== UPLOAD ET VÉRIFICATION CELERY LANCÉE ===")
        logger.info(f"ID Vérification: {image_verification.id}, Task ID: {task_result.id}")
        
        return {
            'success': True,
            'verification_id': image_verification.id,
            'task_id': task_result.id,
            'image_url': upload_result['public_url']
        }
        
    except Exception as e:
        logger.error(f"Erreur dans upload_and_verify_image_task: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        return {
            'success': False,
            'error': str(e)
        }


# ---------------------------------------------------------------------------
# Public checks (/api/checks/). The legacy tasks above are unchanged.
# These tasks never create Fact rows: new checks are unlisted by default.
# ---------------------------------------------------------------------------
from celery.exceptions import SoftTimeLimitExceeded  # noqa: E402
from django.utils import timezone  # noqa: E402


def _finish_check(check_id, **fields):
    """Save the outcome only if the check is still running (a cancel or a
    timeout wins over a late result). Returns True if saved."""
    from .models import Check

    fields['completed_at'] = timezone.now()
    return Check.objects.filter(pk=check_id, state='running').update(**fields) == 1


def _fail_check(check_id):
    """Save the check as a safe error and remove its stored image."""
    from .models import Check
    from .services.checks import discard_check_image

    failed = _finish_check(
        check_id, state='error', verdict='', explanation=SAFE_ANALYSIS_ERROR_MESSAGE, sources=[], confidence=None,
    )
    if failed:
        check = Check.objects.filter(pk=check_id).exclude(image_path='').first()
        if check is not None:
            discard_check_image(check)
    return failed


def _load_running_check(check_id):
    from .models import Check

    check = Check.objects.filter(pk=check_id).first()
    if check is None or check.state != 'running':
        return None
    return check


@shared_task(soft_time_limit=240, time_limit=270)
def run_text_check(check_id):
    """Analyse a text check with the same pipeline as the legacy submissions."""
    from .services.checks import map_text_status, normalize_sources, MISSING_EXPLANATION_MESSAGE

    check = _load_running_check(check_id)
    if check is None:
        return {'success': False, 'check_id': check_id}
    try:
        analysis_result, web_sources = analyze_text(check.claim)
        statut = analysis_result.get('statut') if isinstance(analysis_result, dict) else None
        state, verdict = map_text_status(statut)
        if state == 'error':
            # analyze_text embeds raw exception text in 'explication' on ERREUR.
            logger.error(f"run_text_check: analyse en ERREUR pour le check {check_id}")
            saved = _fail_check(check_id)
        else:
            explanation = analysis_result.get('explication') if isinstance(analysis_result, dict) else None
            explanation = str(explanation).strip() if explanation else ''
            saved = _finish_check(
                check_id,
                state=state,
                verdict=verdict,
                explanation=explanation or MISSING_EXPLANATION_MESSAGE,
                sources=normalize_sources(web_sources),
                confidence=None,
            )
        return {'success': saved, 'check_id': check_id, 'state': state}
    except SoftTimeLimitExceeded:
        logger.error(f"run_text_check: délai dépassé pour le check {check_id}")
        _fail_check(check_id)
        return {'success': False, 'check_id': check_id, 'state': 'error'}
    except Exception:
        logger.exception(f"run_text_check: échec pour le check {check_id}")
        _fail_check(check_id)
        return {'success': False, 'check_id': check_id, 'state': 'error'}


@shared_task(soft_time_limit=240, time_limit=270)
def run_image_check(check_id):
    """Analyse an image check (content or AI detection) with the legacy image services."""
    from .services.checks import map_image_status, MISSING_EXPLANATION_MESSAGE

    check = _load_running_check(check_id)
    if check is None:
        return {'success': False, 'check_id': check_id}
    try:
        if check.kind == 'image_ai':
            result = detect_ai_generated_image(check.image_url)
        else:
            result = verify_image_content(check.image_url, check.claim)
        result = result if isinstance(result, dict) else {}
        state, verdict = map_image_status(result.get('statut'))
        if state == 'error':
            logger.error(f"run_image_check: analyse en ERREUR pour le check {check_id}")
            saved = _fail_check(check_id)
        else:
            try:
                confidence = max(0, min(100, int(result.get('confidence'))))
            except (TypeError, ValueError):
                confidence = None
            explanation = result.get('explication')
            explanation = str(explanation).strip() if explanation else ''
            saved = _finish_check(
                check_id,
                state=state,
                verdict=verdict,
                explanation=explanation or MISSING_EXPLANATION_MESSAGE,
                sources=[],
                confidence=confidence,
            )
        return {'success': saved, 'check_id': check_id, 'state': state}
    except SoftTimeLimitExceeded:
        logger.error(f"run_image_check: délai dépassé pour le check {check_id}")
        _fail_check(check_id)
        return {'success': False, 'check_id': check_id, 'state': 'error'}
    except Exception:
        logger.exception(f"run_image_check: échec pour le check {check_id}")
        _fail_check(check_id)
        return {'success': False, 'check_id': check_id, 'state': 'error'}
