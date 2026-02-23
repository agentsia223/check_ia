# Test Plan

This document consolidates the QA process for Check-IA: testing strategy, sample test cases, data structure decisions, and pull request workflow.

## 1. Testing Strategy

### Tools & Frameworks

| Layer | Framework | Config |
|-------|-----------|--------|
| **Backend** | pytest + pytest-django + pytest-cov | `pyproject.toml`, `conftest.py`, `config/settings_test.py` |
| **Frontend** | Jest + React Testing Library | `client/package.json` (jest config) |
| **CI/CD** | GitHub Actions | `.github/workflows/test.yml` |

### Test Categories

- **Unit tests** — Validate individual models, serializers, and utility functions in isolation
- **Integration tests** — Test API endpoints with mocked external services (Supabase, AI APIs)
- **Smoke tests** — Verify the frontend renders without errors

### CI Pipeline

Tests run automatically on every pull request and push to `main` via `.github/workflows/test.yml`:

- **Backend job**: Python 3.12, `pytest --cov=core` with SQLite in-memory database
- **Frontend job**: Node.js 18, `npm test -- --watchAll=false --coverage`

Both jobs must pass before a PR can be merged.

### Test Environment

- Backend uses `config/settings_test.py` which overrides the database to SQLite in-memory and adds `django.contrib.auth` (needed by DRF test client)
- `conftest.py` sets required environment variables (`DJANGO_SECRET_KEY`, `DB_HOST`, `SUPABASE_URL`) before Django loads
- Frontend mocks `@supabase/supabase-js` and `AuthContext` to avoid real API calls

---

## 2. Test Cases

### User Stories

#### Text Verification

| User Story | Test Case | Module |
|-----------|-----------|--------|
| As a user, I can submit a claim for fact-checking | `test_submission_create` | `test_views.py` |
| As a user, I see my submission history | `test_user_submissions_list` | `test_views.py` |
| Submissions require authentication | `test_submit_requires_auth` | `test_views.py` |

#### Image Verification

| User Story | Test Case | Module |
|-----------|-----------|--------|
| As a user, I can verify an image with a claim | `test_verify_image_content` | `test_views.py` |
| As a user, I can detect AI-generated images | `test_detect_ai_image` | `test_views.py` |
| As a user, I see my verification history | `test_image_verifications_list` | `test_views.py` |

#### Data Integrity

| User Story | Test Case | Module |
|-----------|-----------|--------|
| Facts have associated keywords | `test_fact_keyword_relationship` | `test_models.py` |
| Deleting a fact clears keyword links | `test_fact_delete_clears_keywords` | `test_models.py` |
| Submissions track the correct user | `test_submission_user_fields` | `test_models.py` |
| Serializers produce valid output | `test_fact_serializer_output` | `test_serializers.py` |

### Test File Inventory

| File | Tests | Coverage |
|------|-------|----------|
| `core/tests/test_models.py` | 13 tests | Fact, Keyword, Submission, ImageVerification, VerifiedMedia models |
| `core/tests/test_serializers.py` | 5 tests | Keyword, Fact, Submission, VerifiedMedia serializers |
| `core/tests/test_views.py` | 6 tests | Public endpoints, auth-required endpoints |
| `client/src/App.test.js` | 1 test | Full App smoke test with mocked Supabase |

### Running Tests

```bash
# Backend
pytest -v
pytest --cov=core --cov-report=term-missing -v

# Frontend
cd client
npm test -- --watchAll=false
npm test -- --watchAll=false --coverage
```

---

## 3. Data Structures

Check-IA uses Django ORM models backed by Supabase PostgreSQL. All models are defined in `core/models.py`.

### Model Summary

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Fact** | Verified facts in the library | `texte`, `source`, `date`, `mots_cles` (M2M), `web_sources` (JSON) |
| **Keyword** | Categorization tags for facts | `mot`, `date` |
| **Submission** | User-submitted claims for verification | `supabase_user_id`, `texte`, `statut`, `detailed_result`, `web_sources` (JSON) |
| **ImageVerification** | Image verification requests and results | `supabase_user_id`, `image_url`, `verification_type`, `status`, `confidence`, `details` (JSON) |
| **VerifiedMedia** | Media files attached to facts | `fact` (FK), `media_type`, `fichier`, `description` |

### Design Decisions

- **Supabase user IDs instead of Django User model** — Authentication is handled entirely by Supabase. The backend stores the Supabase UUID and email for reference but does not maintain a local user table.
- **JSONField for flexible data** — `web_sources` and `details` fields use JSONField for variable-structure data returned by AI services.
- **French field names** — Some fields use French names (`texte`, `statut`, `mots_cles`) reflecting the project's primary audience, while newer fields use English.
- **Supabase Storage for images** — Images are uploaded to Supabase Storage rather than Django's file storage, enabling CDN delivery and signed URLs.

For full field-level documentation, see [Data Models](https://agentsia223.github.io/check_ia/architecture/data-models/).

---

## 4. PR Workflow

### Branching Strategy

All work is done in feature branches created from `main`:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/add-audio-verification` |
| `fix/` | Bug fixes | `fix/login-redirect-error` |
| `docs/` | Documentation | `docs/update-api-reference` |

### Pull Request Process

1. Push branch to fork
2. Open PR against `main` using the [PR template](.github/PULL_REQUEST_TEMPLATE.md)
3. Fill in description, link related issues, complete checklist
4. CI checks must pass (backend + frontend tests)
5. Request review from a maintainer
6. Address feedback, then maintainer merges

### CI Requirements

Both jobs in `.github/workflows/test.yml` must pass:

- **Backend Tests** — `pytest --cov=core` (Python 3.12)
- **Frontend Tests** — `npm test -- --watchAll=false --coverage` (Node.js 18)

### Branch Protection Rules

- Pull request reviews required before merging
- CI status checks must pass
- Branches must be up to date with `main`
- Force pushes are not allowed

For full contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
