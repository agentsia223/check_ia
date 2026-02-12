# factcheck/tasks.py

from celery import shared_task
from .services.ai_analysis import analyze_text
from .services.image_verification import verify_image_content, detect_ai_generated_image
from .services.supabase_storage import upload_image_to_supabase, create_bucket_if_not_exists
import logging

logger = logging.getLogger(__name__)

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
                'INDÉTERMINÉE': 'rejeté'
            }
            final_status = status_mapping.get(ai_status, 'rejeté')
            
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
        
        # Marquer la soumission comme erreur
        try:
            submission = Submission.objects.get(id=submission_id)
            submission.statut = 'rejeté'
            submission.detailed_result = f'Erreur lors de l\'analyse: {str(e)}'
            submission.save()
        except:
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
