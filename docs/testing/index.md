# Testing Overview

Check-IA uses pytest for backend testing and Jest with React Testing Library for frontend testing.

## Testing Strategy

- **Unit tests** — Validate individual models, serializers, and utility functions in isolation
- **Integration tests** — Test API endpoints with mocked external services
- **Smoke tests** — Verify the frontend renders without errors

## User Stories and Test Cases

### Text Verification

| User Story | Test Case | Module |
|-----------|-----------|--------|
| As a user, I can submit a claim for fact-checking | `test_submission_create` | `test_views.py` |
| As a user, I see my submission history | `test_user_submissions_list` | `test_views.py` |
| Submissions require authentication | `test_submit_requires_auth` | `test_views.py` |

### Image Verification

| User Story | Test Case | Module |
|-----------|-----------|--------|
| As a user, I can verify an image with a claim | `test_verify_image_content` | `test_views.py` |
| As a user, I can detect AI-generated images | `test_detect_ai_image` | `test_views.py` |
| As a user, I see my verification history | `test_image_verifications_list` | `test_views.py` |

### Data Integrity

| User Story | Test Case | Module |
|-----------|-----------|--------|
| Facts have associated keywords | `test_fact_keyword_relationship` | `test_models.py` |
| Deleting a fact clears keyword links | `test_fact_delete_clears_keywords` | `test_models.py` |
| Submissions track the correct user | `test_submission_user_fields` | `test_models.py` |
| Serializers produce valid output | `test_fact_serializer_output` | `test_serializers.py` |

## Running Tests

See [Backend Tests](backend.md) and [Frontend Tests](frontend.md) for detailed instructions.

## CI Integration

Tests run automatically on every pull request and push to `main` via the GitHub Actions workflow at `.github/workflows/test.yml`.
