# SST.dev Backend Template

A production-ready, reusable boilerplate for AWS serverless backend projects using [SST.dev](https://sst.dev) Ion v3.

## 🚀 Features

- **SST Ion v3** - Modern serverless framework with excellent DX
- **TypeScript** - Full type safety throughout the application
- **DynamoDB** - Single-table design pattern with GSI support
- **API Gateway V2** - RESTful API with automatic OpenAPI documentation
- **External Authorization** - Support for existing Lambda authorizers by ARN, JWT authorizer, and IAM auth
- **Testing** - Jest setup with AWS SDK mocking
- **CI/CD** - AWS CodeBuild integration with GitHub webhooks
- **Environment Management** - Stage-based environment configuration
- **Secrets Management** - AWS Secrets Manager integration with in-memory caching
- **Production Ready** - Comprehensive error handling, logging, and monitoring

## 📋 Quick Start

### Prerequisites

- Node.js 18+ 
- AWS CLI configured with appropriate permissions
- AWS Account ID
- **Valid AWS credentials** (required for `npm start` and Lambda debugging)
- **VS Code with Biome extension** (recommended for best development experience)

### Setup Checklist

- [ ] Update `package.json` name field
- [ ] Update app name in `sst.config.ts` (replace `TODO_APP_NAME`)
- [ ] Create `.env.dev` from `.env.example` for local development
- [ ] Update AWS account ID in `.env.test`, `.env.prod`
- [ ] Configure AWS credentials
- [ ] Create secrets in AWS Secrets Manager (using secret IDs from .env files)
- [ ] Run `npm install`
- [ ] **Install VS Code extensions** (VS Code will prompt you automatically)
- [ ] Run `npm start` to develop locally

### 🎯 VS Code Setup

This template includes VS Code workspace settings for optimal development experience:

- **Biome Extension**: Automatic formatting and linting
- **Format on Save**: Code is automatically formatted when you save
- **Import Organization**: Imports are automatically sorted and organized
- **Debugging**: Pre-configured debug configurations for tests and SST dev

When you open this project in VS Code, you'll be prompted to install the recommended extensions. Click "Install All" for the best experience.

### Installation

```bash
# Clone and setup
git clone <your-repo-url>
cd sst-backend-template-typescript
npm install

# Create your local development environment file
cp .env.example .env.dev
# Update AWS account ID in .env.test, .env.prod

# Create secrets in AWS Secrets Manager
# Use the secret IDs from your .env files

# Start local development
npm start
```

## 🏗️ Project Structure

```
├── sst.config.ts                 # SST infrastructure configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── jest.config.unit.js           # Jest test configuration
├── buildspec.test.yml            # CodeBuild spec for test environment
├── buildspec.prod.yml            # CodeBuild spec for production
├── src/
│   ├── handlers/
│   │   └── http/
│   │       ├── health.ts         # Health check endpoint
│   │       └── createItem.ts     # Example CRUD handler
│   ├── dal/
│   │   └── dynamodb.ts           # DynamoDB client and repository
│   ├── libs/
│   │   ├── response.ts           # HTTP response helpers
│   │   └── secrets.ts            # AWS Secrets Manager helper
│   └── types/
│       └── item.ts               # TypeScript type definitions
├── tests/
│   ├── setup.unit.ts             # Test setup and mocks
│   └── handlers.unit.test.ts     # Example tests
└── docs/
    ├── SETUP.md                  # Detailed setup guide
    ├── DEPLOYMENT.md             # Deployment instructions
    ├── ARCHITECTURE.md           # Architecture overview
    └── MIGRATION_FROM_SERVERLESS.md # Migration guide
```

## 🛠️ Development

### Local Development

```bash
# Start SST dev server (requires valid AWS credentials)
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

### 🔑 AWS Credentials Setup

**Important**: You need valid AWS credentials to use `npm start` and debug Lambda functions.

#### Option 1: AWS SSO (Recommended)
```bash
# Configure AWS SSO
aws configure sso

# Login to SSO
aws sso login --profile your-profile-name

# Use profile with SST
export AWS_PROFILE=your-profile-name
npm start
```

#### Option 2: AWS CLI Credentials
```bash
# Configure AWS CLI
aws configure

# Verify credentials
aws sts get-caller-identity

# Start development
npm start
```

#### Option 3: Environment Variables
```bash
# Set credentials as environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_SESSION_TOKEN=your-session-token  # If using temporary credentials

# Start development
npm start
```

**Troubleshooting**: If you get credential errors, check:
- ✅ Credentials are not expired
- ✅ Profile is correctly configured
- ✅ Required permissions are granted
- ✅ Region matches your SST configuration

### Available Scripts

- `npm start` - Start local development server
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## 🚀 Deployment

### Manual Deployment

```bash
# Deploy to test environment
npm run deploy:test

# Deploy to production
npm run deploy:prod

# Remove all resources
npm run remove
```

### CI/CD with AWS CodeBuild

This template includes AWS CodeBuild configuration for automated deployments:

- **Test Environment**: Deploys on every push to `main` branch
- **Production Environment**: Manual trigger or specific branch protection rules

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed setup instructions.

## 🏛️ Architecture

### Infrastructure

- **API Gateway HTTP API** - RESTful API with automatic OpenAPI docs
- **DynamoDB** - Single-table design with GSI for flexible querying
- **Lambda Functions** - Serverless compute with automatic scaling
- **AWS SSM Parameter Store** - SST state management (no S3 bucket needed)

### Data Model

The template uses a single-table design pattern:

- **Primary Key**: `pk` (partition key) + `sk` (sort key)
- **GSI1**: `gsi1pk` + `gsi1sk` for alternative access patterns
- **Entity Types**: Items, Users, and other entities in the same table

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## 🔧 Configuration

### Environment Variables

The template uses a **secure configuration approach** that separates sensitive and non-sensitive data:

#### 📁 **Environment Files (Committed to Git)**
- `.env.test` - Test environment configuration (non-sensitive)
- `.env.prod` - Production configuration (non-sensitive)
- `.env.example` - Template for creating new environment files

#### 👨‍💻 **Developer Environment Files (Not Committed)**
- `.env.dev` - Each developer creates their own local development configuration
- `.env.local` - Local overrides (ignored by Git)
- `.env.{developer-name}` - Developer-specific configurations (ignored by Git)

#### 🔐 **Sensitive Data (AWS Secrets Manager)**
All sensitive data is stored in AWS Secrets Manager, not in environment files:
- API keys and tokens
- Database passwords
- Private keys
- Webhook secrets
- Any other sensitive configuration

#### 📋 **Required Variables (Non-Sensitive)**
```bash
AWS_REGION=eu-north-1
AWS_ACCOUNT=123456789012
```

#### 🔧 **Optional Variables (Non-Sensitive)**
```bash
# Secrets Manager IDs (not the actual secrets)
SECRETS_ID=your-app-secrets
API_KEYS_SECRET_ID=your-api-keys
DATABASE_CONFIG_SECRET_ID=your-db-config

# Optional: External Authorizer
# AUTHORIZER_ARN=arn:aws:lambda:eu-north-1:123456789012:function:my-existing-authorizer
```

### SST Configuration

The `sst.config.ts` file contains all infrastructure definitions:

- DynamoDB table with single-table design
- API Gateway V2 routes with external authorization support
- Lambda function configurations
- Environment variable bindings

### Authorization Configuration

The template supports external authorization using existing Lambda authorizer functions:

**External Lambda Authorizer** (Reference existing authorizer by ARN):
```typescript
const externalAuthorizer = api.addAuthorizer("ExternalAuthorizer", {
  lambda: {
    functionArn: envVars.AUTHORIZER_ARN, // ARN of your existing authorizer
    identitySources: ["$request.header.Authorization"],
    ttl: "3600 seconds"
  }
});
```

**JWT Authorizer** (Token-based authentication):
```typescript
const jwtAuthorizer = api.addAuthorizer("JWTAuthorizer", {
  jwt: {
    issuer: "https://your-auth-provider.com",
    audiences: ["your-api-audience"]
  }
});
```

**Protected Routes**:
```typescript
api.route("POST /items", {
  handler: "src/handlers/http/createItem.handler",
  auth: { lambda: externalAuthorizer.id }
});
```

See [External Authorizer Guide](docs/CUSTOM_AUTHORIZER.md) for detailed implementation.

## 🔐 IAM Permissions & Resource Linking

SST automatically handles IAM permissions through its **link system**, making it easy to grant Lambda functions access to AWS resources.

### 🔗 How SST Link Works

When you use `link: [table]` in your route configuration, SST automatically:

```typescript
api.route("POST /items", {
  handler: "src/handlers/http/createItem.handler",
  link: [table], // 🔑 Automatically creates IAM permissions
  environment: {
    TABLE_NAME: table.name,
  },
});
```

**What happens behind the scenes:**
- ✅ **Creates IAM execution role** for the Lambda function
- ✅ **Generates IAM policy** with DynamoDB permissions for the specific table
- ✅ **Injects environment variables** (like `TABLE_NAME`)
- ✅ **Handles all permission management** automatically

### 🛡️ Automatic Permissions Granted

For DynamoDB tables, SST automatically grants:
- `dynamodb:PutItem` - Create new items
- `dynamodb:GetItem` - Read individual items
- `dynamodb:Query` - Query items with conditions
- `dynamodb:UpdateItem` - Update existing items
- `dynamodb:DeleteItem` - Delete items
- `dynamodb:Scan` - Scan table (if needed)

### 📋 Permission Flow Example

Here's how our `createItem.ts` handler gets DynamoDB access:

```typescript
// 1. SST Config links the table
api.route("POST /items", {
  handler: "src/handlers/http/createItem.handler",
  link: [table], // Links to DynamoDB table
});

// 2. Lambda gets TABLE_NAME environment variable
// 3. ItemRepository uses the table name
const getTableName = (): string => {
  return process.env.TABLE_NAME || "items-table";
};

// 4. DynamoDB operations work automatically
await ddbDocClient.send(new PutCommand({
  TableName: getTableName(), // Uses linked table
  Item: item,
}));
```

### ⚙️ Custom IAM Permissions

If you need additional permissions beyond what SST provides automatically:

```typescript
api.route("POST /items", {
  handler: "src/handlers/http/createItem.handler",
  link: [table],
  permissions: [
    {
      actions: ["secretsmanager:GetSecretValue"],
      resources: ["arn:aws:secretsmanager:*:*:secret:my-secret-*"]
    }
  ]
});
```

### 🔄 Cross-Service Permissions

For services like Secrets Manager, you can link them too:

```typescript
// In sst.config.ts
const secret = new sst.aws.SecretsManager("MySecret", {
  secret: {
    name: "my-secret",
    description: "My application secret"
  }
});

// Link to Lambda function
api.route("GET /config", {
  handler: "src/handlers/http/getConfig.handler",
  link: [secret], // Automatically grants secretsmanager:GetSecretValue
});
```

### 🎯 Key Benefits

- **🔒 Security**: Least privilege access - only grants necessary permissions
- **🚀 Simplicity**: No manual IAM policy writing required
- **🔄 Consistency**: Same pattern works across all AWS services
- **🛠️ Maintainability**: Permissions automatically update when resources change

## 🔐 Secrets Management

The template includes a robust secrets management system with AWS Secrets Manager integration and in-memory caching.

### 🚀 **Features**

- **📦 In-Memory Caching** - 15-minute TTL to reduce AWS API calls
- **🔄 Automatic Cache Invalidation** - Cache cleared when secrets are updated
- **📝 JSON Support** - Easy handling of structured configuration data
- **⚡ Performance Optimized** - Cached secrets return instantly
- **🛡️ Error Handling** - Comprehensive error handling and logging

### 💡 **Usage Examples**

```typescript
import { getSecret, getSecretAsJson, setSecretAsJson, clearSecretCache } from "@/libs/secrets";

// Get a simple string secret (cached for 15 minutes)
const apiKey = await getSecret("my-api-key");

// Get a JSON configuration (cached for 15 minutes)
const dbConfig = await getSecretAsJson<{
  host: string;
  port: number;
  username: string;
  password: string;
}>("database-config");

// Update a secret (automatically clears cache)
await setSecretAsJson("api-config", {
  baseUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
});

// Manually clear cache if needed
clearSecretCache("my-api-key"); // Clear specific secret
clearSecretCache(); // Clear all cached secrets
```

### ⚙️ **Configuration**

Set your secret IDs in environment variables:

```bash
# .env.dev
SECRETS_ID=my-app-secrets
API_KEYS_SECRET_ID=my-api-keys
DATABASE_CONFIG_SECRET_ID=my-db-config
```

### 🎯 **Benefits**

- **💰 Cost Reduction** - Fewer AWS Secrets Manager API calls
- **⚡ Faster Response Times** - Cached secrets return instantly
- **🔄 Smart Invalidation** - Cache automatically cleared on updates
- **🛡️ Type Safety** - Full TypeScript support for JSON secrets

### 🔒 **Security Benefits**

- **🚫 No Secrets in Git** - Sensitive data never committed to version control
- **🔐 Centralized Secret Management** - All secrets managed in AWS Secrets Manager
- **🔄 Easy Secret Rotation** - Update secrets without code changes
- **👥 Team Collaboration** - Non-sensitive config shared via Git, secrets managed separately
- **🛡️ Audit Trail** - AWS CloudTrail tracks all secret access
- **⚡ Performance** - 15-minute caching reduces API calls and costs

### 📝 **Example: Storing API Keys**

```typescript
// ❌ DON'T: Put sensitive data in .env files
// .env.dev
EXTERNAL_API_KEY=sk_1234567890abcdef  // NEVER DO THIS!

// ✅ DO: Store secret ID in .env file, actual secret in AWS Secrets Manager
// .env.dev
EXTERNAL_API_KEYS_SECRET_ID=external-api-keys-dev

// AWS Secrets Manager
// Secret Name: external-api-keys-dev
// Secret Value: {"apiKey": "sk_1234567890abcdef", "webhookSecret": "whsec_..."}

// Usage in code
const apiKeys = await getSecretAsJson<{
  apiKey: string;
  webhookSecret: string;
}>(process.env.EXTERNAL_API_KEYS_SECRET_ID!);
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

- **Jest** with TypeScript support
- **AWS SDK mocking** for DynamoDB and other services
- **Comprehensive test coverage** for handlers and utilities
- **Mock data** for common scenarios

## 📚 Documentation

- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [Deployment Guide](docs/DEPLOYMENT.md) - CI/CD and deployment setup
- [Architecture Guide](docs/ARCHITECTURE.md) - System design and patterns
- [External Authorizer Guide](docs/CUSTOM_AUTHORIZER.md) - Using existing Lambda authorizers by ARN
- [Migration Guide](docs/MIGRATION_FROM_SERVERLESS.md) - Migrating from Serverless Framework

## 🔄 Migration from Serverless Framework

If you're migrating from the Serverless Framework, see our [migration guide](docs/MIGRATION_FROM_SERVERLESS.md) for:

- Key differences between Serverless and SST
- Step-by-step migration checklist
- Common patterns and their SST equivalents

## 🆚 Why SST over Serverless Framework?

- **Better DX**: Live Lambda development with instant feedback
- **Type Safety**: Full TypeScript support with Resource bindings
- **Modern Architecture**: Built for AWS CDK with better resource management
- **No Plugins**: Built-in features reduce complexity
- **Better Testing**: Improved local testing experience
- **State Management**: Uses AWS SSM instead of S3 for state storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

MIT License.

## 🆘 Support

- [SST Documentation](https://docs.sst.dev)
- [SST Discord](https://discord.gg/sst)
- [GitHub Issues](https://github.com/your-org/sst-backend-template/issues)

---

**Ready to build your next serverless application?** Start with this template and focus on your business logic instead of infrastructure setup!
