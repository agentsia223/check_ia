"""
Test settings for Check-IA.

Uses SQLite in-memory database and eager Celery execution
to avoid requiring external services (PostgreSQL, Redis) in CI.
"""

from .settings import *  # noqa: F401, F403

# Override database to use SQLite in-memory
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Keep test app configuration aligned with production. DRF is configured to use
# None for unauthenticated users, so django.contrib.auth is not required.

# Run Celery tasks synchronously during tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
