from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    FactViewSet, SubmissionViewSet, VerifiedMediaViewSet, KeywordViewSet,
    verify_image_content_view, detect_ai_image_view, get_image_verifications_view,
    check_task_status_view, bambara_translate_view, bambara_transcribe_view,
    bambara_warm_view,
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
    path('bambara/translate/', bambara_translate_view, name='bambara_translate'),
    path('bambara/transcribe/', bambara_transcribe_view, name='bambara_transcribe'),
    path('bambara/warm/', bambara_warm_view, name='bambara_warm'),
]


# Public checks API (web redesign). `checks/claim/` must precede `checks/<id>/`.
from core.views_checks import (  # noqa: E402
    CheckListCreateView, CheckClaimView, CheckDetailView, CheckCancelView,
    CheckFeedbackView, CheckRelatedView,
)

urlpatterns += [
    path('checks/', CheckListCreateView.as_view(), name='checks'),
    path('checks/claim/', CheckClaimView.as_view(), name='checks_claim'),
    path('checks/<str:public_id>/', CheckDetailView.as_view(), name='check_detail'),
    path('checks/<str:public_id>/cancel/', CheckCancelView.as_view(), name='check_cancel'),
    path('checks/<str:public_id>/feedback/', CheckFeedbackView.as_view(), name='check_feedback'),
    path('checks/<str:public_id>/related/', CheckRelatedView.as_view(), name='check_related'),
]
