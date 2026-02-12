from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    FactViewSet, SubmissionViewSet, VerifiedMediaViewSet, KeywordViewSet,
    verify_image_content_view, detect_ai_image_view, get_image_verifications_view,
    check_task_status_view
)
from core.services.deep_translator import get_facts_translated
# from . import views

router = DefaultRouter()
router.register(r'facts', FactViewSet)
router.register(r'submissions', SubmissionViewSet)
router.register(r'verified_media', VerifiedMediaViewSet)
router.register(r'keywords', KeywordViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('facts_translated/', get_facts_translated, name='get_facts_translated'),
    path('verify-image-content/', verify_image_content_view, name='verify_image_content'),
    path('detect-ai-image/', detect_ai_image_view, name='detect_ai_image'),
    path('image-verifications/', get_image_verifications_view, name='get_image_verifications'),
    path('task-status/<str:task_id>/', check_task_status_view, name='check_task_status'),
]