# Backend Tests

Backend tests use **pytest** with **pytest-django** and run against an in-memory SQLite database (no external services required).

## Setup

Install test dependencies:

```bash
pip install pytest pytest-django pytest-cov
```

## Running Tests

```bash
DJANGO_SETTINGS_MODULE=config.settings_test pytest -v
```

Or, since `DJANGO_SETTINGS_MODULE` is configured in `pyproject.toml`:

```bash
pytest -v
```

### With Coverage

```bash
pytest --cov=core --cov-report=term-missing -v
```

## Test Configuration

- **`pyproject.toml`** — Contains `[tool.pytest.ini_options]` with the test settings module
- **`conftest.py`** — Sets required environment variables before Django loads
- **`config/settings_test.py`** — Overrides the database to SQLite and enables eager Celery execution

## Test Structure

```
core/tests/
├── __init__.py
├── test_models.py          # Model creation, string representations, deletion
├── test_serializers.py     # Serializer round-trip validation
└── test_views.py           # API endpoint tests with mocked auth
```

## Writing New Tests

1. Add tests to the appropriate file in `core/tests/`
2. Use Django's `TestCase` class for database tests
3. Mock external services (Supabase, AI APIs) — never make real API calls in tests
4. Run tests locally before submitting a PR
