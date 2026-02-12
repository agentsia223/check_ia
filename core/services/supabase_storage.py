import logging
import os
import uuid
from datetime import datetime
from django.conf import settings
from supabase import create_client, Client
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile

logger = logging.getLogger(__name__)

def get_supabase_client():
    """
    Get Supabase client with service role key for storage operations
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )

def upload_image_to_supabase(image_file, user_id, verification_type="general"):
    """
    Upload an image file to Supabase storage bucket
    
    Args:
        image_file: Django uploaded file object
        user_id: Supabase user UUID
        verification_type: Type of verification (content, ai_detection, etc.)
    
    Returns:
        dict: Contains success status, file_path, and public_url
    """
    try:
        logger.info(f"=== DÉBUT UPLOAD SUPABASE ===")
        logger.info(f"Utilisateur: {user_id}")
        logger.info(f"Type de vérification: {verification_type}")
        logger.info(f"Nom du fichier: {image_file.name}")
        logger.info(f"Taille du fichier: {image_file.size} bytes")
        
        # Create Supabase client
        supabase: Client = get_supabase_client()
        
        # Generate unique filename
        file_extension = image_file.name.split('.')[-1] if '.' in image_file.name else 'jpg'
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{user_id}/{verification_type}/{timestamp}_{uuid.uuid4().hex[:8]}.{file_extension}"
        
        logger.info(f"Nom de fichier généré: {unique_filename}")
        
        # Read file content
        if hasattr(image_file, 'read'):
            image_file.seek(0)  # Reset file pointer
            file_content = image_file.read()
        else:
            file_content = image_file
            
        logger.info(f"Contenu du fichier lu: {len(file_content)} bytes")
        
        # Upload to Supabase storage
        bucket_name = "image-verifications"
        
        logger.info(f"Upload vers le bucket: {bucket_name}")
        logger.info(f"Chemin du fichier: {unique_filename}")
        
        # Upload file
        result = supabase.storage.from_(bucket_name).upload(
            path=unique_filename,
            file=file_content,
            file_options={
                "content-type": f"image/{file_extension}",
                "cache-control": "3600"
            }
        )
        
        logger.info(f"Résultat de l'upload: {result}")
        
        # Get signed URL instead of public URL (more secure and works with private buckets)
        signed_url_response = supabase.storage.from_(bucket_name).create_signed_url(
            unique_filename, 
            expires_in=31536000  # 1 year expiration
        )
        signed_url = signed_url_response.get('signedURL') if signed_url_response else None
        
        if not signed_url:
            # Fallback to public URL if signed URL fails
            public_url_response = supabase.storage.from_(bucket_name).get_public_url(unique_filename)
            signed_url = public_url_response
            
            # Clean up the URL - remove trailing query parameters if empty
            if signed_url.endswith('?'):
                signed_url = signed_url[:-1]
        
        logger.info(f"URL générée: {signed_url}")
        
        return {
            "success": True,
            "file_path": unique_filename,
            "public_url": signed_url,
            "bucket": bucket_name
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de l'upload vers Supabase: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "file_path": None,
            "public_url": None
        }

def delete_image_from_supabase(file_path):
    """
    Delete an image from Supabase storage
    
    Args:
        file_path: Path to the file in Supabase storage
        
    Returns:
        dict: Contains success status
    """
    try:
        logger.info(f"=== SUPPRESSION FICHIER SUPABASE ===")
        logger.info(f"Chemin du fichier: {file_path}")
        
        supabase: Client = get_supabase_client()
        bucket_name = "image-verifications"
        
        # Delete file
        result = supabase.storage.from_(bucket_name).remove([file_path])
        
        logger.info(f"Résultat de la suppression: {result}")
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la suppression: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def get_image_url_from_supabase(file_path, bucket_name="image-verifications"):
    """
    Get signed URL for an image from Supabase storage
    """
    try:
        supabase = get_supabase_client()
        
        # Get signed URL instead of public URL
        signed_url_response = supabase.storage.from_(bucket_name).create_signed_url(
            file_path, 
            expires_in=31536000  # 1 year expiration
        )
        signed_url = signed_url_response.get('signedURL') if signed_url_response else None
        
        if not signed_url:
            # Fallback to public URL if signed URL fails
            public_url_response = supabase.storage.from_(bucket_name).get_public_url(file_path)
            signed_url = public_url_response
            
            # Clean up the URL - remove trailing query parameters if empty
            if signed_url.endswith('?'):
                signed_url = signed_url[:-1]
        
        logger.info(f"URL récupérée pour {file_path}: {signed_url}")
        return signed_url
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'URL: {str(e)}")
        return None

def create_bucket_if_not_exists():
    """
    Create the image-verifications bucket if it doesn't exist
    """
    try:
        logger.info("=== VÉRIFICATION/CRÉATION DU BUCKET ===")
        
        supabase: Client = get_supabase_client()
        bucket_name = "image-verifications"
        
        # List existing buckets
        buckets = supabase.storage.list_buckets()
        bucket_names = [bucket.name for bucket in buckets]
        
        logger.info(f"Buckets existants: {bucket_names}")
        
        if bucket_name not in bucket_names:
            logger.info(f"Création du bucket: {bucket_name}")
            
            # Create bucket
            result = supabase.storage.create_bucket(
                bucket_name,
                options={
                    "public": True,
                    "file_size_limit": 10485760,  # 10MB limit
                    "allowed_mime_types": ["image/jpeg", "image/png", "image/gif", "image/webp"]
                }
            )
            
            logger.info(f"Bucket créé: {result}")
            return {"success": True, "created": True}
        else:
            logger.info(f"Bucket {bucket_name} existe déjà")
            return {"success": True, "created": False}
            
    except Exception as e:
        logger.error(f"Erreur lors de la création du bucket: {str(e)}")
        return {"success": False, "error": str(e)} 