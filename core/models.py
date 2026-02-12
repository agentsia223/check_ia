from django.db import models
from django.utils import timezone
import uuid
import logging

logger = logging.getLogger(__name__)

class Fact(models.Model):
    texte = models.TextField()  # Le texte du fait à vérifier
    source = models.URLField(max_length=200)  # L'URL de la source du fait
    date = models.DateTimeField(auto_now_add=True)  # Date à laquelle le fait a été ajouté
    mots_cles = models.ManyToManyField('Keyword')  # Les mots-clés associés au fait
    web_sources = models.JSONField(blank=True, null=True)  # Sources web utilisées pour vérifier l'information

    def delete(self, *args, **kwargs):
        # Clear the ManyToMany relationship before deleting the Fact instance
        self.mots_cles.clear()
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.texte[:50]  # Retourne une portion du texte pour représentation


class Keyword(models.Model):
    mot = models.CharField(max_length=100)  # Le mot-clé
    date = models.DateTimeField(default=timezone.now)  # Ajouter une date par défaut pour les anciennes entrées

    def __str__(self):
        return self.mot


class Submission(models.Model):
    # Replace Django User foreign key with Supabase user fields
    supabase_user_id = models.UUIDField()  # Supabase user UUID
    user_email = models.EmailField()  # User email for display and reference
    user_name = models.CharField(max_length=150, blank=True)  # User's display name
    
    texte = models.TextField()  # Le texte de l'information à vérifier
    source = models.URLField(max_length=200, blank=True, null=True)  # Source de l'information (facultatif)
    date = models.DateTimeField(auto_now_add=True)  # Date de soumission
    statut = models.CharField(max_length=50, choices=[('en cours', 'En cours'), ('vérifié', 'Vérifié'), ('rejeté', 'Rejeté')], default='en cours')  # Statut de la soumission
    web_sources = models.JSONField(blank=True, null=True)  # Sources web utilisées pour vérifier l'information
    detailed_result = models.TextField(blank=True, null=True)  # Detailed analysis result

    def __str__(self):
        return f"{self.texte[:50]} - {self.user_email}"  # Include user email in representation


class ImageVerification(models.Model):
    # User information
    supabase_user_id = models.UUIDField()  # Supabase user UUID
    user_email = models.EmailField()  # User email for display and reference
    user_name = models.CharField(max_length=150, blank=True)  # User's display name
    
    # Image and verification details - using Supabase storage
    image_path = models.CharField(max_length=1000)  # Path to image in Supabase storage
    image_url = models.URLField(max_length=1000)  # Public URL of the image in Supabase
    original_filename = models.CharField(max_length=255)  # Original filename
    claim_text = models.TextField(blank=True, null=True)  # Optional claim about the image
    verification_type = models.CharField(
        max_length=50, 
        choices=[
            ('content', 'Content Verification'), 
            ('ai_detection', 'AI Detection')
        ]
    )  # Type of verification
    
    # Results
    status = models.CharField(
        max_length=50, 
        choices=[
            ('EN_COURS', 'En cours'),
            ('VRAIE', 'Vraie'),
            ('FAUSSE', 'Fausse'), 
            ('INDÉTERMINÉE', 'Indéterminée'),
            ('ANALYSÉE', 'Analysée'),
            ('IA_DÉTECTÉE', 'IA Détectée'),
            ('AUTHENTIQUE', 'Authentique'),
            ('INCERTAIN', 'Incertain'),
            ('ERREUR', 'Erreur')
        ]
    )
    explanation = models.TextField()  # Detailed explanation from AI
    confidence = models.IntegerField(default=0)  # Confidence level (0-100)
    details = models.JSONField(blank=True, null=True)  # Additional details
    
    # Metadata
    date = models.DateTimeField(auto_now_add=True)  # Date of verification
    model_used = models.CharField(max_length=100, default='openai/gpt-4.1-mini')  # AI model used
    
    def __str__(self):
        claim_preview = self.claim_text[:30] if self.claim_text else "No claim"
        return f"{self.verification_type} - {claim_preview} - {self.user_email}"

    def delete(self, *args, **kwargs):
        """
        Override delete to also remove image from Supabase storage
        """
        try:
            from .services.supabase_storage import delete_image_from_supabase
            if self.image_path:
                delete_result = delete_image_from_supabase(self.image_path)
                if not delete_result["success"]:
                    logger.warning(f"Failed to delete image from Supabase: {delete_result.get('error')}")
        except Exception as e:
            logger.warning(f"Error deleting image from Supabase during model deletion: {e}")
        
        super().delete(*args, **kwargs)

    class Meta:
        ordering = ['-date']


class VerifiedMedia(models.Model):
    fact = models.ForeignKey(Fact, on_delete=models.CASCADE)  # Référence au fait vérifié
    media_type = models.CharField(max_length=50, choices=[('image', 'Image'), ('vidéo', 'Vidéo')])  # Type de média
    fichier = models.FileField(upload_to='verified_media/')  # Fichier média (image ou vidéo)
    description = models.TextField(blank=True, null=True)  # Description du média

    def __str__(self):
        return f"{self.media_type} pour {self.fact.texte[:30]}"