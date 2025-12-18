# AI Presentation API

Backend API for generating and managing AI-powered presentations. Built with [SST.dev](https://sst.dev) Ion v3.

## 🚀 Features

- **AI Presentation Generation** - Generate professional presentations from title and description using OpenAI
- **Slide Management** - Create, read, update slides with AI assistance
- **Google OAuth Authentication** - Secure authentication with optional user whitelist
- **Async Processing** - SQS-based queue for async presentation generation
- **WebSocket Notifications** - Real-time updates when presentations are generated
- **DynamoDB Storage** - Single-table design for presentations and slides

## 📋 API Endpoints

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/presentations/{id}` | Get a presentation by ID |

### Protected Endpoints (require authentication)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/presentations` | Create a new presentation (queued for AI generation) |
| `GET` | `/presentations` | Get all presentations for the authenticated user |
| `PUT` | `/presentations/{id}` | Update presentation metadata |
| `DELETE` | `/presentations/{id}` | Delete a presentation |
| `PUT` | `/presentations/{id}/slides/{index}` | Update a slide with AI |

## 🏗️ Project Structure

```
├── sst.config.ts                 # SST infrastructure configuration
├── package.json                  # Dependencies and scripts
├── scripts/
│   ├── deploy-secrets.ts         # Deploy secrets to AWS Secrets Manager
│   ├── .secrets.example.json     # Example secrets file (commit this)
│   └── .secrets.json             # Actual secrets (DO NOT commit)
├── src/
│   ├── handlers/
│   │   ├── http/
│   │   │   ├── health.ts             # Health check endpoint
│   │   │   ├── createPresentation.ts # Create presentation
│   │   │   ├── getPresentation.ts    # Get presentation by ID
│   │   │   ├── getUserPresentations.ts # Get user's presentations
│   │   │   ├── updatePresentation.ts # Update presentation metadata
│   │   │   ├── updateSlide.ts        # Update slide with AI
│   │   │   └── deletePresentation.ts # Delete presentation
│   │   └── sqs/
│   │       └── generatePresentation.ts # SQS handler for async generation
│   ├── libs/
│   │   ├── presentationRepo.ts   # DynamoDB operations
│   │   ├── openai.ts             # OpenAI integration
│   │   ├── auth.ts               # Google OAuth authentication
│   │   ├── secrets.ts            # AWS Secrets Manager loader
│   │   └── response.ts           # HTTP response helpers
│   └── types/
│       └── presentation.ts       # TypeScript type definitions
├── tests/                        # Unit tests
└── docs/                         # Documentation
```

## 🛠️ Setup

### Prerequisites

- Node.js 24+
- AWS CLI configured with appropriate permissions
- OpenAI API key
- Google OAuth credentials (for authentication)

### Secrets Management

Sensitive credentials (OpenAI API key, Google OAuth) are stored in AWS Secrets Manager, not in environment files.

#### 1. Create secrets file

Copy the example and add your credentials:

```bash
cp scripts/.secrets.example.json scripts/.secrets.json
```

Edit `scripts/.secrets.json`:
```json
{
  "test": {
    "OPENAI_API_KEY": "sk-proj-your-actual-key",
    "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "your-client-secret"
  },
  "prod": {
    "OPENAI_API_KEY": "sk-proj-your-prod-key",
    "GOOGLE_CLIENT_ID": "your-prod-client-id.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "your-prod-client-secret"
  }
}
```

#### 2. Deploy secrets to AWS

```bash
# Deploy test secrets
AWS_PROFILE=your-profile npm run deploy:secrets:test

# Deploy production secrets
AWS_PROFILE=your-profile npm run deploy:secrets:prod
```

This creates secrets in AWS Secrets Manager:
- `qodea-presentation-agent-test`
- `qodea-presentation-agent-prod`

### Environment Variables

Create environment files for each stage (`.env.dev`, `.env.test`, `.env.prod`):

```bash
# AWS Account (required)
AWS_ACCOUNT=your-aws-account-id
AWS_REGION=eu-north-1

# Secrets ID (required - references AWS Secrets Manager)
SECRETS_ID=qodea-presentation-agent-test

# OpenAI Model (optional - defaults to gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini

# User Whitelist (optional - comma-separated emails)
USER_WHITELIST=user1@example.com,user2@example.com

# CORS Origins (optional - comma-separated)
CORS_ORIGINS=http://localhost:3000,https://your-app-domain.com

# WebSocket API (optional - for real-time notifications)
WEBSOCKET_API_ENDPOINT=wss://your-websocket-api.execute-api.eu-north-1.amazonaws.com/production
```

### Installation

```bash
# Install dependencies
npm install

# Deploy secrets first (one-time setup per stage)
AWS_PROFILE=your-profile npm run deploy:secrets:test

# Start local development
npm start

# Deploy to test environment
npm run deploy:test

# Deploy to production
npm run deploy:prod
```

## 🔐 Authentication

The API uses Google OAuth for authentication. Protected endpoints require a valid Google ID token in the Authorization header:

```
Authorization: Bearer <google-id-token>
```

### Development Mode (Auth Disabled)

If `GOOGLE_CLIENT_ID` is not configured in AWS Secrets Manager, authentication is automatically disabled. This allows testing the API without setting up Google OAuth.

In dev mode, all requests use a default user: `anonymous@dev.local`

### User Whitelist

Set `USER_WHITELIST` environment variable to restrict access to specific email addresses. If not set, all authenticated users are allowed.

## 📊 Data Model

### DynamoDB Single-Table Design

| Entity | PK | SK | GSI1PK | GSI1SK |
|--------|----|----|--------|--------|
| Presentation Metadata | `PRESENTATION#{id}` | `METADATA` | `USER#{userId}` | `PRESENTATION#{id}` |
| Slide | `PRESENTATION#{id}` | `SLIDE#000` | - | - |

### Presentation Metadata

```typescript
interface PresentationMetadata {
  id: string;
  title: string;
  description?: string;
  userId: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  theme: PresentationTheme;
  errorMessage?: string;
}
```

### Slide Types

- `title` - Hero slide with tagline, title, subtitle, metrics
- `section` - Numbered navigation sections
- `content` - General content with sections, deliverables, benefits
- `split` - Two-column layout with image
- `quote` - Large quote with attribution
- `metrics-enhanced` - Financial-style metrics
- `multi-column` - Three-column layout

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

### Manual Deployment

```bash
# First time: Deploy secrets to AWS Secrets Manager
AWS_PROFILE=your-profile npm run deploy:secrets:test
AWS_PROFILE=your-profile npm run deploy:secrets:prod

# Deploy to test environment
npm run deploy:test

# Deploy to production
npm run deploy:prod

# Remove all resources
npm run remove
```

### CI/CD with AWS CodeBuild

Use the provided `buildspec.test.yml` and `buildspec.prod.yml` for automated deployments.

## 📚 API Usage Examples

### Create a Presentation

```bash
curl -X POST https://your-api-url/presentations \
  -H "Authorization: Bearer <google-id-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q4 Business Review",
    "description": "Quarterly business review covering sales, marketing, and product updates"
  }'
```

Response:
```json
{
  "presentationId": "presentation-1702567890123-abc123xyz",
  "status": "processing",
  "message": "Presentation generation started"
}
```

### Get a Presentation

```bash
curl https://your-api-url/presentations/presentation-1702567890123-abc123xyz
```

### Update a Slide with AI

```bash
curl -X PUT https://your-api-url/presentations/presentation-1702567890123-abc123xyz/slides/2 \
  -H "Authorization: Bearer <google-id-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Make this slide more visually impactful with larger metrics"
  }'
```

## 🔄 Frontend Integration

Update your frontend to call the external API instead of internal Next.js API routes:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-url';

// Create presentation
const response = await fetch(`${API_URL}/presentations`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${googleIdToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ title, description }),
});

// Get presentation
const presentation = await fetch(`${API_URL}/presentations/${id}`);
```

## 📄 License

MIT License.
