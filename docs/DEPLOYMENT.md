# Deployment Guide

This guide covers deploying your SST backend template to AWS using both manual deployment and automated CI/CD with AWS CodeBuild.

## Manual Deployment

### Prerequisites

- AWS CLI configured with appropriate permissions
- Environment files created (`.env.test`, `.env.prod`)
- SST CLI installed globally (optional): `npm install -g sst`

### Deploy to Test Environment

```bash
# Deploy to test stage
npm run deploy:test

# Or using SST CLI directly
sst deploy --stage test
```

### Deploy to Production

```bash
# Deploy to production stage
npm run deploy:prod

# Or using SST CLI directly
sst deploy --stage prod
```

### Remove Resources

```bash
# Remove all resources for a stage
sst remove --stage test
sst remove --stage prod
```

## CI/CD with AWS CodeBuild

This template includes AWS CodeBuild configuration for automated deployments. SST uses AWS SSM Parameter Store for state management, so **no S3 deployment bucket is required**.

### Step 1: Create CodeBuild Service Role

1. Go to **IAM** in the AWS Console
2. Click **Roles** → **Create role**
3. Select **AWS service** → **CodeBuild**
4. Attach the following policies:
   - `AWSCodeBuildDeveloperAccess`
   - `CloudFormationFullAccess`
   - `IAMFullAccess`
   - `AmazonDynamoDBFullAccess`
   - `AmazonAPIGatewayAdministrator`
   - `AWSLambdaFullAccess`
   - `AmazonSSMFullAccess`
5. Name the role: `codebuild-service-role`
6. Click **Create role**

### Step 2: Create CodeBuild Project for Test Environment

1. Go to **CodeBuild** in the AWS Console
2. Click **Create build project**

#### Basic Information
- **Project name**: `your-app-name-test`
- **Description**: `Build and deploy your-app-name to test environment`
- **Build badge**: ✅ **Check this box**

#### Source
- **Source provider**: GitHub
- **Repository**: Repository in my GitHub account
- **Repository URL**: Select your repository
- **Source version**: `refs/heads/main`
- **Webhook**: ✅ **Check this box**
- **Event type**: PUSH
- **Start a build under these conditions**:
  - **HEAD_REF**: `^refs/heads/main$`

#### Environment
- **Environment image**: Managed image
- **Operating system**: Ubuntu
- **Runtime**: Standard
- **Image**: `aws/codebuild/amazonlinux2-x86_64-standard:5.0`
- **Image version**: Always use the latest image for this runtime version
- **Environment type**: Linux
- **Compute**: 3 GB memory, 2 vCPUs
- **Privileged**: ❌ **Uncheck this**
- **Service role**: Existing service role
- **Service role ARN**: Select `codebuild-service-role`

#### Buildspec
- **Buildspec name**: `buildspec.test.yml`
- **Use a buildspec file**: ✅ **Check this**

#### Artifacts
- **Type**: No artifacts
- **Cache**: No cache

#### Logs
- **CloudWatch Logs**: ✅ **Check this**
- **Group name**: `/aws/codebuild/your-app-name-test`
- **Stream name**: `build-log`

1. Click **Create build project**

### Step 3: Create CodeBuild Project for Production

Repeat Step 2 with these changes:

#### Basic Information
- **Project name**: `your-app-name-prod`
- **Description**: `Build and deploy your-app-name to production environment`

#### Source
- **Webhook**: ❌ **Uncheck this** (manual triggers only for production)

#### Buildspec
- **Buildspec name**: `buildspec.prod.yml`

#### Logs
- **Group name**: `/aws/codebuild/your-app-name-prod`

### Step 4: Configure Environment Variables

For each CodeBuild project, add environment variables:

1. Go to your CodeBuild project
2. Click **Edit** → **Environment**
3. Add the following environment variables:

#### Test Environment Variables
```
AWS_ACCOUNT = 123456789012
AWS_REGION = eu-north-1
SST_STAGE = test
```

#### Production Environment Variables
```
AWS_ACCOUNT = 123456789012
AWS_REGION = eu-north-1
SST_STAGE = prod
```

### Step 5: Set up GitHub Webhook (Test Environment)

1. Go to your CodeBuild test project
2. Click **Edit** → **Source**
3. Under **Webhook**, click **Rebuild**
4. Copy the **Payload URL** and **Secret**
5. Go to your GitHub repository
6. Click **Settings** → **Webhooks** → **Add webhook**
7. Paste the **Payload URL**
8. Set **Content type** to `application/json`
9. Paste the **Secret**
10. Select **Just the push event**
11. Click **Add webhook**

### Step 6: Configure Branch Protection (Optional)

For production deployments, consider setting up branch protection:

1. Go to your GitHub repository
2. Click **Settings** → **Branches**
3. Click **Add rule**
4. Set **Branch name pattern** to `main`
5. Enable **Require status checks to pass before merging**
6. Select your CodeBuild test project
7. Click **Create**

## Build Badges

Add build status badges to your README:

```markdown
![Build Status TEST](https://codebuild.eu-north-1.amazonaws.com/badges?uuid=YOUR-BUILD-PROJECT-ID)
![Build Status PROD](https://codebuild.eu-north-1.amazonaws.com/badges?uuid=YOUR-PROD-BUILD-PROJECT-ID)
```

To get the badge URLs:
1. Go to your CodeBuild project
2. Click **Build history**
3. Click on a successful build
4. Copy the badge URL from the build details

## Deployment Workflow

### Automatic Deployment (Test)

1. **Push to main branch** → Triggers test deployment
2. **CodeBuild runs** → Installs dependencies, runs tests, deploys
3. **Resources created** → DynamoDB table, API Gateway, Lambda functions
4. **Deployment complete** → API URL available in build logs

### Manual Deployment (Production)

1. **Go to CodeBuild console**
2. **Select production project**
3. **Click "Start build"**
4. **Monitor build progress**
5. **Deployment complete** → Production API available

## Environment-Specific Configuration

### Test Environment
- **Stage**: `test`
- **Removal Policy**: `remove` (resources deleted when stack is removed)
- **Environment File**: `.env.test`
- **Deployment**: Automatic on push to main

### Production Environment
- **Stage**: `prod`
- **Removal Policy**: `retain` (resources preserved when stack is removed)
- **Environment File**: `.env.prod`
- **Deployment**: Manual trigger only

## Monitoring Deployments

### CodeBuild Logs
- **CloudWatch Logs**: `/aws/codebuild/your-app-name-test`
- **Build History**: Available in CodeBuild console
- **Build Artifacts**: Optional, configured in buildspec

### SST Console
- **Local Development**: `sst console` opens SST dashboard
- **Deployed Resources**: View in AWS Console or SST console

### API Monitoring
- **API Gateway**: Monitor requests, errors, latency
- **Lambda**: Monitor invocations, errors, duration
- **DynamoDB**: Monitor read/write capacity, throttling

## Troubleshooting

### Common Deployment Issues

#### 1. Permission Denied
**Error**: `AccessDenied` during deployment

**Solution**:
- Verify CodeBuild service role has required permissions
- Check AWS credentials in environment variables
- Ensure AWS account ID is correct

#### 2. Environment File Missing
**Error**: `Environment file .env.test not found!`

**Solution**:
- Ensure environment files exist in repository
- Check file names match the stage (`.env.test`, `.env.prod`)
- Verify file contents have required variables

#### 3. Resource Already Exists
**Error**: `Resource already exists`

**Solution**:
- Check if resources exist from previous deployment
- Use `sst remove --stage <stage>` to clean up
- Verify stage names are unique

#### 4. Build Timeout
**Error**: Build times out after 60 minutes

**Solution**:
- Increase build timeout in CodeBuild project settings
- Optimize build process (cache dependencies)
- Check for infinite loops in deployment

### Rollback Strategy

If a deployment fails:

1. **Check build logs** for specific error
2. **Fix the issue** in your code
3. **Redeploy** using the same process
4. **Monitor** the new deployment

For production issues:
1. **Immediate rollback**: Deploy previous working version
2. **Investigate**: Check logs and metrics
3. **Fix and redeploy**: Once issue is resolved

## Security Considerations

### CodeBuild Security
- **Service Role**: Use least privilege principle
- **Environment Variables**: Store sensitive data in AWS Secrets Manager
- **VPC**: Consider using VPC for CodeBuild if needed
- **Encryption**: Enable encryption for build artifacts

### Deployment Security
- **Branch Protection**: Require status checks for production
- **Manual Approval**: Consider manual approval for production deployments
- **Environment Isolation**: Separate AWS accounts for different environments
- **Secrets Management**: Use AWS Secrets Manager for sensitive configuration

## Cost Optimization

### CodeBuild Costs
- **Build Duration**: Optimize build time to reduce costs
- **Compute Type**: Use appropriate instance types
- **Caching**: Enable caching for dependencies

### AWS Resource Costs
- **DynamoDB**: Use on-demand billing for development
- **Lambda**: Monitor cold starts and optimize memory
- **API Gateway**: Consider usage-based pricing

## Next Steps

After setting up deployment:

1. **Monitor**: Set up CloudWatch alarms for key metrics
2. **Scale**: Configure auto-scaling for DynamoDB and Lambda
3. **Security**: Implement authentication and authorization
4. **Backup**: Set up DynamoDB point-in-time recovery
5. **Documentation**: Keep deployment documentation updated
