from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from deep_translator import GoogleTranslator
from core.models import Fact

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_facts_translated(request):
    # Check if user is authenticated (simplified check for Supabase user)
    if not hasattr(request.user, 'is_authenticated') or not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    facts = Fact.objects.all()
    translated_facts = set()
    seen_texts = set()  # Set to track unique translated texts

    for fact in facts:
        translated_text = GoogleTranslator(source='auto', target='fr').translate(fact.texte)
        
        # Only add fact if the translated_text has not been seen before
        if translated_text not in seen_texts:
            fact_tuple = (
                fact.id,
                translated_text,
                fact.source,
                fact.date
            )
            translated_facts.add(fact_tuple)
            seen_texts.add(translated_text)  # Mark this translated text as seen

    # Convert the set back to a list of dictionaries for JSON serialization
    translated_facts_list = [
        {
            "id": fact[0],
            "texte": fact[1],
            "source": fact[2],
            "date": fact[3],
        } for fact in translated_facts
    ]

    return JsonResponse(translated_facts_list, safe=False)
