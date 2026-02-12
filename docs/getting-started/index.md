# Getting Started

This guide covers setting up Check-IA for local development. The project has two main components: a Django backend and a React frontend.

## Prerequisites

- Python 3.12+
- Node.js 18+
- Redis (for Celery task queue)
- A [Supabase](https://supabase.com) project (for authentication, database, and storage)

## Setup Overview

1. **Clone the repository**

    ```bash
    git clone https://github.com/agentsia223/check_ia.git
    cd check_ia
    ```

2. **Configure environment variables** — See [Environment Variables](environment.md)

3. **Set up the backend** — See [Backend Setup](backend.md)

4. **Set up the frontend** — See [Frontend Setup](frontend.md)

5. **Start the Celery worker** (required for async AI analysis)

    ```bash
    # Start Redis (separate terminal)
    redis-server

    # Start Celery worker (separate terminal)
    celery -A config worker --loglevel=info
    ```

Once all services are running, the frontend is available at `http://localhost:3000` and the backend API at `http://localhost:8000`.
