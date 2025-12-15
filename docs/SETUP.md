# Setup Guide

This guide will walk you through setting up the SST backend template for local development and deployment.

## Prerequisites

Before you begin, ensure you have the following installed and configured:

### Required Software

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **AWS CLI v2** - [Installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **Git** - [Download from git-scm.com](https://git-scm.com/)

### AWS Account Setup

1. **AWS Account**: You need an active AWS account
2. **AWS Account ID**: Note down your 12-digit AWS account ID
3. **AWS Region**: Choose your preferred region (default: `eu-north-1`)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd sst-backend-template-typescript

# Install dependencies
npm install
```

## Step 2: Configure AWS Credentials

### Option A: AWS CLI Configuration (Recommended)

```bash
# Configure AWS CLI
aws configure

# Enter your credentials when prompted:
# AWS Access Key ID: [Your access key]
# AWS Secret Access Key: [Your secret key]
# Default region name: eu-north-1
# Default output format: json
```

### Option B: Environment Variables

```bash
# Set environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=eu-north-1
```

### Option C: AWS Profiles

```bash
# Create a named profile
aws configure --profile my-profile

# Use the profile
export AWS_PROFILE=my-profile
```

## Step 3: Environment Configuration

### Create Environment Files

```bash
# Copy the example environment file
cp .env.example .env.dev

# Edit the environment file
nano .env.dev  # or use your preferred editor
```

### Configure Environment Variables

Edit `.env.dev` with your values:

```bash
# AWS Configuration
AWS_REGION=eu-north-1
AWS_ACCOUNT=123456789012  # Replace with your AWS account ID

# Custom Authorizer (optional)
# AUTHORIZER_ARN=arn:aws:lambda:eu-north-1:123456789012:function:my-existing-authorizer

# Secrets Manager IDs (optional)
# SECRETS_ID=your-secrets-manager-secret-id
```

### Create Additional Environment Files

For different stages, create corresponding environment files:

```bash
# Test environment
cp .env.example .env.test
# Edit .env.test with test-specific values

# Production environment  
cp .env.example .env.prod
# Edit .env.prod with production values
```

## Step 4: Update Template Placeholders

### Update Package.json

```bash
# Edit package.json and update the name field
{
  "name": "your-app-name",  # Replace TODO_APP_NAME
  ...
}
```

### Update SST Configuration

Edit `sst.config.ts`:

```typescript
export default {
  config(_input) {
    return {
      name: "your-app-name",  // Replace TODO_APP_NAME
      region: "eu-north-1",   // Replace TODO_REGION if needed
    };
  },
  // ... rest of config
}
```

## Step 5: Verify Setup

### Test AWS Connection

```bash
# Test AWS CLI connection
aws sts get-caller-identity

# Should return your account information
```

### Test Local Development

```bash
# Start the development server
npm start

# You should see output similar to:
# ✓  SST v3.x.x ready
# ✓  API: https://xxxxx.execute-api.eu-north-1.amazonaws.com
# ✓  Table: your-app-name-table
```

### Test API Endpoints

Once the dev server is running, test the endpoints:

```bash
# Health check
curl https://your-api-url/health

# Create an item
curl -X POST https://your-api-url/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item", "description": "A test item"}'
```

## Step 6: Run Tests

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint
```

## Troubleshooting

### Common Issues

#### 1. AWS Credentials Not Found

**Error**: `Unable to locate credentials`

**Solution**:
```bash
# Verify AWS credentials
aws sts get-caller-identity

# If this fails, reconfigure AWS CLI
aws configure
```

#### 2. Environment File Not Found

**Error**: `Environment file .env.dev not found!`

**Solution**:
```bash
# Create the environment file
cp .env.example .env.dev
# Edit with your values
```

#### 3. Permission Denied

**Error**: `AccessDenied` or `Forbidden`

**Solution**:
- Ensure your AWS user has sufficient permissions
- Check that your AWS account ID is correct
- Verify the region is correct

#### 4. Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Kill processes using the port
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm start
```

### Required AWS Permissions

Your AWS user/role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*",
        "lambda:*",
        "apigateway:*",
        "iam:*",
        "ssm:*",
        "cloudformation:*",
        "s3:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Development Workflow

1. **Make Changes**: Edit your code in the `src/` directory
2. **Test Locally**: Use `npm start` for live development
3. **Run Tests**: Use `npm test` to verify functionality
4. **Deploy**: Use `npm run deploy:test` for test environment
5. **Production**: Use `npm run deploy:prod` for production

### Environment-Specific Notes

#### Development (.env.dev)
- Used for local development with `npm start`
- Can use mock services or local alternatives
- No real AWS resources needed for basic testing

#### Test (.env.test)
- Used for test environment deployments
- Real AWS resources but with test data
- Automatic deployment via CI/CD

#### Production (.env.prod)
- Used for production deployments
- Real AWS resources with production data
- Manual deployment or protected CI/CD

## Next Steps

Once setup is complete:

1. **Read the Architecture Guide**: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
2. **Set up CI/CD**: [docs/DEPLOYMENT.md](DEPLOYMENT.md)
3. **Start Building**: Add your business logic to the handlers
4. **Customize**: Modify the DynamoDB schema and API routes as needed

## Getting Help

- Check the [SST Documentation](https://docs.sst.dev)
- Join the [SST Discord](https://discord.gg/sst)
- Create an issue in this repository
