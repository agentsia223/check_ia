from rest_framework import serializers
from .models import Fact, Submission, VerifiedMedia, Keyword

class KeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Keyword
        fields = ['mot']  # Specify the fields you want to include in the serialization (in this case, just 'mot')

class FactSerializer(serializers.ModelSerializer):
    mots_cles = KeywordSerializer(many=True, read_only=True)
    
    class Meta:
        model = Fact
        fields = '__all__'

class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = '__all__'
        read_only_fields = ['supabase_user_id', 'user_email', 'user_name']  # These are set automatically from the authenticated user

class VerifiedMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerifiedMedia
        fields = '__all__'
