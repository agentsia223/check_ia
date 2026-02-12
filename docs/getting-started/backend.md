# Backend Setup

The backend is a Django 5.1 application using Django REST Framework for the API layer.

## Install Dependencies

```bash
pip install -r requirements.txt
```

This installs Django, DRF, Celery, spaCy, PyTorch, Transformers, and other required packages. The full dependency list is in `requirements.txt`.

!!! note
    The `torch` and `transformers` packages are large. The initial install may take several minutes.

## Download spaCy Model

The French NLP model is required for keyword extraction:

```bash
python -m spacy download fr_core_news_sm
```

## Run Migrations

```bash
python manage.py migrate
```

This creates the necessary database tables in your Supabase PostgreSQL instance.

## Start the Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`. You can verify it's running by visiting `http://localhost:8000/api/`.

## Celery Worker

AI analysis tasks run asynchronously through Celery with Redis as the message broker:

```bash
# Start Redis (separate terminal)
redis-server

# Start Celery worker (separate terminal)
celery -A config worker --loglevel=info
```
