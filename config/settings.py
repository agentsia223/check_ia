# Paramètres principaux pour Django

from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Définition des applications installées
INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'rest_framework',
    'core',
    'corsheaders',
]

# Middleware pour gérer les requêtes
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.SupabaseAuthMiddleware',  # Custom Supabase auth middleware
]

_cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')
if _cors_origins == '*':
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = _cors_origins.split(',')

# The web client sends X-Anon-Token for signed-out checks (/api/checks/).
from corsheaders.defaults import default_headers  # noqa: E402
CORS_ALLOW_HEADERS = (*default_headers, 'x-anon-token')

# Salt for hashing client IPs in the checks quotas (only the hash is stored).
CHECKS_IP_HASH_SALT = os.getenv('CHECKS_IP_HASH_SALT', '') or SECRET_KEY
# Client IP for the anonymous quotas (see core/services/checks.py::client_ip).
# Measured on Railway on 2026-11-17 with an echo service: the edge overwrites
# a client-sent X-Real-IP with the real address, and rewrites X-Forwarded-For
# to "<client>, <edge>" (client-sent entries are dropped). So X-Real-IP is
# trusted by default, and the fallback reads the 2nd X-Forwarded-For entry
# from the right. On another host, re-check both before relying on the quotas.
try:
    CHECKS_TRUSTED_PROXY_COUNT = max(1, int(os.getenv('CHECKS_TRUSTED_PROXY_COUNT', '2')))
except ValueError:
    CHECKS_TRUSTED_PROXY_COUNT = 2
CHECKS_TRUST_X_REAL_IP = os.getenv('CHECKS_TRUST_X_REAL_IP', 'True').lower() == 'true'

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Configuration de la base de données Supabase
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'postgres'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('SUPABASE_DB_PASSWORD'),
        'HOST': os.environ['DB_HOST'],
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
        },
    }
}

# Supabase Configuration
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Bambara voice and translation API
BAMBARA_API_BASE_URL = os.getenv('BAMBARA_API_BASE_URL', '')
BAMBARA_API_KEY = os.getenv('BAMBARA_API_KEY', '')
BAMBARA_API_TIMEOUT = int(os.getenv('BAMBARA_API_TIMEOUT', '120'))
GOOGLE_TRANSLATE_API_KEY = os.getenv('GOOGLE_TRANSLATE_API_KEY', '')
GOOGLE_TRANSLATE_TIMEOUT = int(os.getenv('GOOGLE_TRANSLATE_TIMEOUT', '15'))


# Configuration internationale
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Fichiers statiques
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Configuration du framework Django REST
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'core.authentication.SupabaseAuthentication',  # Custom Supabase authentication
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Production intentionally does not install django.contrib.auth; use None
    # instead of DRF's default AnonymousUser import from django.contrib.auth.
    'UNAUTHENTICATED_USER': None,
}

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'core.authentication': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Configuration de Celery
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
CELERY_ACCEPT_CONTENT = ['json']
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
CELERY_TASK_SERIALIZER = 'json'
