# Data Models

Check-IA uses Django ORM models backed by Supabase PostgreSQL. All models are defined in `core/models.py`.

## Entity Relationship

![Entity Relationships](../assets/images/entity-relationships.png)

## Models

### Fact

Represents a verified fact stored in the platform's library.

| Field | Type | Description |
|-------|------|-------------|
| `texte` | TextField | The fact text |
| `source` | URLField | Primary source URL |
| `date` | DateTimeField | Date added (auto) |
| `mots_cles` | ManyToManyField → Keyword | Associated keywords |
| `web_sources` | JSONField | Web sources used for verification |

The `delete()` method clears the ManyToMany relationship before deletion.

### Keyword

Simple keyword model for categorizing and searching facts.

| Field | Type | Description |
|-------|------|-------------|
| `mot` | CharField(100) | The keyword text |
| `date` | DateTimeField | Date added |

### Submission

A user-submitted text claim for fact-checking. Linked to Supabase users via UUID rather than Django's auth system.

| Field | Type | Description |
|-------|------|-------------|
| `supabase_user_id` | UUIDField | Supabase user UUID |
| `user_email` | EmailField | User email |
| `user_name` | CharField | Display name |
| `texte` | TextField | Submitted claim text |
| `source` | URLField | Optional source URL |
| `date` | DateTimeField | Submission date (auto) |
| `statut` | CharField | Status: `en cours`, `verifie`, `rejete` |
| `web_sources` | JSONField | Sources found during verification |
| `detailed_result` | TextField | Full analysis result |

### ImageVerification

Stores image verification requests and results. Supports two verification types: content verification and AI detection.

| Field | Type | Description |
|-------|------|-------------|
| `supabase_user_id` | UUIDField | Supabase user UUID |
| `user_email` | EmailField | User email |
| `user_name` | CharField | Display name |
| `image_path` | CharField | Path in Supabase Storage |
| `image_url` | URLField | Public image URL |
| `original_filename` | CharField | Original file name |
| `claim_text` | TextField | Claim about the image (optional) |
| `verification_type` | CharField | `content` or `ai_detection` |
| `status` | CharField | Result status (see below) |
| `explanation` | TextField | AI-generated explanation |
| `confidence` | IntegerField | Confidence level (0-100) |
| `details` | JSONField | Additional analysis details |
| `date` | DateTimeField | Verification date (auto) |
| `model_used` | CharField | AI model used |

**Status values:** `EN_COURS`, `VRAIE`, `FAUSSE`, `INDETERMINEE`, `ANALYSEE`, `IA_DETECTEE`, `AUTHENTIQUE`, `INCERTAIN`, `ERREUR`

The `delete()` method also removes the associated image from Supabase Storage.

### VerifiedMedia

Media files (images/videos) associated with verified facts.

| Field | Type | Description |
|-------|------|-------------|
| `fact` | ForeignKey → Fact | Associated verified fact |
| `media_type` | CharField | `image` or `video` |
| `fichier` | FileField | Uploaded media file |
| `description` | TextField | Media description |

## Design Decisions

- **Supabase user IDs instead of Django User model**: User authentication is handled entirely by Supabase. The Django backend stores the Supabase UUID and email for reference but does not maintain a local user table.
- **JSONField for web sources and details**: Flexible storage for variable-structure data returned by AI services.
- **French field names**: Some fields use French names (`texte`, `statut`, `mots_cles`) reflecting the project's primary audience, while newer fields use English.
- **Supabase Storage for images**: Images are uploaded to Supabase Storage rather than Django's file storage, enabling CDN delivery and signed URLs.
