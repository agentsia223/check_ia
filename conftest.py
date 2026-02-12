import os

# Set required environment variables before Django settings load.
# These are needed because config/settings.py uses os.environ[] (hard access)
# for certain variables that would crash if unset.
os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key-for-ci-only")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_DB_PASSWORD", "test-password")
os.environ.setdefault("DEBUG", "True")
