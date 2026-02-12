# Environment Variables

Check-IA requires several environment variables for the backend and frontend.

## Backend Environment

Create a `.env` file in the project root:

```bash
# Django
DJANGO_SECRET_KEY=<your-secret-key>
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (Supabase PostgreSQL)
DB_HOST=<your-supabase-db-host>
DB_PORT=6543
DB_NAME=postgres
DB_USER=<your-db-user>
SUPABASE_DB_PASSWORD=<your-db-password>

# Supabase
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# AI Services
OPENROUTER_API_KEY=<your-openrouter-api-key>
PERPLEXITY_API_KEY=<your-perplexity-api-key>

# Celery / Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DJANGO_SECRET_KEY` | Yes | Django cryptographic signing key |
| `DEBUG` | No | Enable debug mode (default: `False`) |
| `ALLOWED_HOSTS` | No | Comma-separated list of allowed hosts |
| `DB_HOST` | Yes | Supabase PostgreSQL host |
| `DB_PORT` | No | Database port (default: `5432`) |
| `DB_NAME` | No | Database name (default: `postgres`) |
| `DB_USER` | No | Database user (default: `postgres`) |
| `SUPABASE_DB_PASSWORD` | Yes | Supabase database password |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key (for admin operations) |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key (for GPT-4o-mini) |
| `PERPLEXITY_API_KEY` | Yes | Perplexity API key (for source search) |
| `REDIS_URL` | No | Redis connection URL (default: `redis://localhost:6379/0`) |
| `CORS_ALLOWED_ORIGINS` | No | Allowed CORS origins (default: `http://localhost:3000`) |

## Frontend Environment

Create a `.env` file in the `client/` directory:

```bash
REACT_APP_SUPABASE_URL=<your-supabase-project-url>
REACT_APP_SUPABASE_ANON_KEY=<your-supabase-anon-key>
REACT_APP_API_URL=http://localhost:8000
```

!!! warning
    Never commit `.env` files to version control. The `.gitignore` already excludes them.
