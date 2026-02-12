<div align="center">

<img src="client/public/logo_check.png" alt="Check-IA Logo" width="120" />

# Check-IA

**AI-powered fact-checking platform for the Sahel region**

[![Tests](https://github.com/agentsia223/check_ia/actions/workflows/test.yml/badge.svg)](https://github.com/agentsia223/check_ia/actions/workflows/test.yml)
[![Django](https://img.shields.io/badge/Django-5.1-092E20?logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20DB%20%7C%20Storage-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Railway](https://img.shields.io/badge/Railway-Deployed-0B0D0E?logo=railway&logoColor=white)](https://railway.app)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

[Live App](https://www.check-ia.app/) &bull; [Report Bug](https://github.com/agentsia223/check_ia/issues) &bull; [Request Feature](https://github.com/agentsia223/check_ia/issues)

</div>

---

## About

Check-IA is a fact-checking platform designed for the cultural and linguistic realities of French-speaking Africa. It uses multiple AI models to verify text claims and images, providing sourced explanations accessible to the general public.

### Key Features

- **Text Verification** &mdash; Submit a claim and get a sourced verdict (True / False / Undetermined) with a detailed explanation
- **Image Content Verification** &mdash; Upload an image with a claim and verify whether the image supports it
- **AI Image Detection** &mdash; Detect whether an image is AI-generated or authentic
- **User Dashboard** &mdash; Track your verification history with an authenticated account

## Tech Stack

| Layer               | Technology                                                                |
| ------------------- | ------------------------------------------------------------------------- |
| **Frontend**        | React 18, Material-UI 6                                                   |
| **Backend**         | Django 5.1, Django REST Framework                                         |
| **Auth & Database** | Supabase (PostgreSQL, JWT Auth, Storage)                                  |
| **Task Queue**      | Celery + Redis                                                            |
| **AI Models**       | RoBERTa, GPT-4o-mini (OpenRouter), Gemini 2.0 Flash, Perplexity Sonar Pro |
| **Deployment**      | Railway                                                                   |

## Architecture

![System Architecture](/docs/assets/images/system-architecture.png)

### AI Analysis Pipeline

```
User Input → RoBERTa Classification → Source Search (Perplexity)
           → LLM Analysis (GPT-4o-mini) → Structured Verdict + Explanation
```

For image verification, Gemini 2.0 Flash performs visual analysis directly.

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Redis
- A [Supabase](https://supabase.com) project

### Environment Variables

Create a `.env` file in the project root for the backend:

```bash
# Django
DJANGO_SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (Supabase PostgreSQL)
DB_HOST=
DB_PORT=6543
DB_NAME=postgres
DB_USER=
DB_PASSWORD=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
OPENROUTER_API_KEY=
PERPLEXITY_API_KEY=

# Celery
REDIS_URL=redis://localhost:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Create a `.env` file in `client/`:

```bash
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
REACT_APP_API_URL=http://localhost:8000
```

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the development server
python manage.py runserver
```

### Frontend

```bash
cd client
npm install
npm start
```

### Celery Worker

```bash
# Start Redis (separate terminal)
redis-server

# Start Celery worker (separate terminal)
celery -A config worker --loglevel=info
```

## API Reference

| Method | Endpoint                     | Description                    |
| ------ | ---------------------------- | ------------------------------ |
| `POST` | `/api/submit-fact/`          | Submit text for fact-checking  |
| `GET`  | `/api/user-submissions/`     | Get user's submission history  |
| `POST` | `/api/verify-image-content/` | Verify a claim about an image  |
| `POST` | `/api/detect-ai-image/`      | Detect AI-generated images     |
| `GET`  | `/api/image-verifications/`  | Get image verification history |
| `GET`  | `/api/facts/`                | List verified facts            |
| `GET`  | `/api/keywords/`             | List available keywords        |

All endpoints except `/api/facts/` and `/api/keywords/` require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

## Project Structure

```
check_ia/
├── config/                   # Django project config
│   ├── settings.py
│   ├── settings_test.py      # Test settings (SQLite, eager Celery)
│   ├── celery.py
│   └── urls.py
├── core/                     # Main Django app
│   ├── models.py             # Submission, ImageVerification, Fact
│   ├── views.py              # API views
│   ├── authentication.py     # Supabase JWT auth backend
│   ├── tests/                # Test suite
│   └── services/
│       ├── ai_analysis.py    # Orchestrates the analysis pipeline
│       ├── llm.py            # OpenRouter (GPT-4o-mini) integration
│       ├── perplexity_search.py  # Source discovery
│       ├── image_verification.py # Gemini vision analysis
│       └── supabase_storage.py   # File upload/signed URLs
├── client/                   # React app
│   ├── src/components/       # UI components
│   ├── src/utils/            # Auth context, routing
│   └── src/lib/              # Supabase client
├── docs/                     # MkDocs documentation source
├── .github/                  # CI/CD workflows, PR/issue templates
├── LICENSE                   # Apache License 2.0
├── CODE_OF_CONDUCT.md        # Contributor Covenant
├── CONTRIBUTING.md            # Contribution guidelines
├── PROJECT_CHARTER.md        # Project vision, mission, values
├── mkdocs.yml                # Documentation site config
├── railway.toml              # Railway backend config
├── railway-celery.toml       # Railway celery worker config
└── requirements.txt
```

## Deployment

The app is deployed on [Railway](https://railway.app) with three services:

- **backend** &mdash; Django + Gunicorn
- **celery-worker** &mdash; Celery with Redis broker
- **frontend** &mdash; React (static build served by Caddy)

Deployments are triggered via GitHub Actions on push to `main`.

## Documentation

Full documentation is available at [https://agentsia223.github.io/check_ia/](https://agentsia223.github.io/check_ia/).

- [Getting Started](https://agentsia223.github.io/check_ia/getting-started/)
- [Architecture](https://agentsia223.github.io/check_ia/architecture/)
- [API Reference](https://agentsia223.github.io/check_ia/api/)
- [Contributing Guide](https://agentsia223.github.io/check_ia/contributing/)

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on the development process, branching strategy, and how to submit pull requests.

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Governance

See our [Project Charter](PROJECT_CHARTER.md) for the project's vision, mission, and community values.

## License

Distributed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Check-IA** &mdash; Combating misinformation with contextual intelligence.

</div>
