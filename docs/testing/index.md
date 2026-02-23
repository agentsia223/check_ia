# Testing Overview

> For the consolidated test plan covering strategy, test cases, data structures, and PR workflow, see [TEST_PLAN.md](https://github.com/agentsia223/check_ia/blob/main/TEST_PLAN.md).

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

## Data Structure Decisions

Tests validate the five core models defined in `core/models.py`: **Fact**, **Keyword**, **Submission**, **ImageVerification**, and **VerifiedMedia**. Key design decisions that affect testing:

- Supabase UUIDs instead of Django User model (no `django.contrib.auth` in production)
- JSONField for variable-structure AI results
- French field names for some models (`texte`, `statut`, `mots_cles`)

For full field-level documentation, see [Data Models](../architecture/data-models.md).

## PR Workflow

All contributions follow the branching strategy (`feature/*`, `fix/*`, `docs/*`) and must pass CI checks before merge. PRs use the [template](https://github.com/agentsia223/check_ia/blob/main/.github/PULL_REQUEST_TEMPLATE.md) and require at least one approving review.

For full details, see [CONTRIBUTING.md](https://github.com/agentsia223/check_ia/blob/main/CONTRIBUTING.md).

## CI Integration

Tests run automatically on every pull request and push to `main` via the GitHub Actions workflow at `.github/workflows/test.yml`.
