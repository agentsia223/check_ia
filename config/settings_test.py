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

# Add django.contrib.auth for test client (DRF APIClient needs Permission model)
INSTALLED_APPS = list(INSTALLED_APPS) + ['django.contrib.auth']

# Run Celery tasks synchronously during tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
