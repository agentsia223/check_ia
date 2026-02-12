# Check-IA

**AI-powered fact-checking platform for the French-speaking Sahel**

Check-IA is a fact-checking platform designed for the cultural and linguistic realities of French-speaking Africa. It uses multiple AI models to verify text claims and images, providing sourced explanations accessible to the general public.

## Key Features

- **Text Verification** — Submit a claim and get a sourced verdict (True / False / Undetermined) with a detailed explanation
- **Image Content Verification** — Upload an image with a claim and verify whether the image supports it
- **AI Image Detection** — Detect whether an image is AI-generated or authentic
- **User Dashboard** — Track your verification history with an authenticated account

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Material-UI 6 |
| **Backend** | Django 5.1, Django REST Framework |
| **Auth & Database** | Supabase (PostgreSQL, JWT Auth, Storage) |
| **Task Queue** | Celery + Redis |
| **AI Models** | RoBERTa, GPT-4o-mini (OpenRouter), Gemini 2.0 Flash, Perplexity Sonar Pro |
| **Deployment** | Railway |

## Quick Links

- [Getting Started](getting-started/index.md) — Set up the project locally
- [Architecture](architecture/index.md) — Understand the system design
- [API Reference](api/index.md) — Explore the REST API
- [Contributing](contributing/index.md) — Help improve Check-IA
- [Testing](testing/index.md) — Run and write tests

## License

Check-IA is licensed under the [Apache License 2.0](https://github.com/agentsia223/check_ia/blob/main/LICENSE).
