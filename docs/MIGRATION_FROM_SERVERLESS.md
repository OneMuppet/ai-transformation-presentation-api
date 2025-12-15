# Migration Guide: Serverless Framework to SST

This guide helps you migrate from the Serverless Framework to SST.dev, covering key differences, migration steps, and common patterns.

## Why Migrate to SST?

### Key Advantages

- **Better Developer Experience**: Live Lambda development with instant feedback
- **Type Safety**: Full TypeScript support with Resource bindings
- **Modern Architecture**: Built on AWS CDK with better resource management
- **No Plugins Required**: Built-in features reduce complexity
- **Better Testing**: Improved local testing experience
- **State Management**: Uses AWS SSM Parameter Store instead of S3

### Comparison Table

| Feature               | Serverless Framework       | SST                        |
|-----------------------|----------------------------|----------------------------|
| **State Storage**     | S3 bucket                  | AWS SSM Parameter Store    |
| **Local Development** | `serverless offline`       | `sst dev` (live Lambda)    |
| **Type Safety**       | Limited                    | Full TypeScript support    |
| **Resource Binding**  | Environment variables      | Direct Resource references |
| **Bundling**          | Plugins (esbuild, webpack) | Built-in esbuild           |
| **Testing**           | Manual setup               | Built-in testing support   |
| **Infrastructure**    | YAML/JSON config           | TypeScript config          |

## Migration Checklist

### Pre-Migration

- [ ] Audit current Serverless Framework setup
- [ ] Document all custom plugins and configurations
- [ ] Identify environment-specific configurations
- [ ] Plan for testing strategy during migration
- [ ] Set up SST development environment

### Migration Steps

- [ ] Create new SST project structure
- [ ] Migrate infrastructure configuration
- [ ] Update Lambda handlers
- [ ] Migrate data access layer
- [ ] Update environment management
- [ ] Migrate CI/CD pipeline
- [ ] Test and validate migration
- [ ] Deploy to new environment
- [ ] Update documentation

### Post-Migration

- [ ] Monitor application performance
- [ ] Update team documentation
- [ ] Train team on SST patterns
- [ ] Clean up old Serverless resources
- [ ] Optimize SST configuration

## Configuration Migration

### Serverless Framework → SST

#### serverless.yml → sst.config.ts

**Before (serverless.yml)**:
```yaml
service: my-app
frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs18.x
  region: eu-north-1
  stage: ${opt:stage, 'dev'}
  environment:
    STAGE: ${self:provider.stage}
    TABLE_NAME: ${self:custom.tableName}

functions:
  health:
    handler: src/handlers/health.handler
    events:
      - httpApi:
          path: /health
          method: get

resources:
  Resources:
    MyTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:custom.tableName}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: pk
            AttributeType: S
          - AttributeName: sk
            AttributeType: S
        KeySchema:
          - AttributeName: pk
            KeyType: HASH
          - AttributeName: sk
            KeyType: RANGE
```

**After (sst.config.ts)**:
```typescript
import { SSTConfig } from "sst";
import { Api, Table } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "my-app",
      region: "eu-north-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const table = new Table(stack, "MyTable", {
        fields: {
          pk: "string",
          sk: "string",
        },
        primaryIndex: { hashKey: "pk", rangeKey: "sk" },
        removalPolicy: stack.stage === "prod" ? "retain" : "remove",
      });

      const api = new Api(stack, "Api", {
        routes: {
          "GET /health": "src/handlers/health.handler",
        },
      });

      api.bind([table]);

      stack.addOutputs({
        ApiUrl: api.url,
        TableName: table.tableName,
      });
    });
  },
} satisfies SSTConfig;
```

### Environment Variables

#### Serverless Framework
```yaml
# serverless.yml
provider:
  environment:
    STAGE: ${self:provider.stage}
    TABLE_NAME: ${self:custom.tableName}
    DATABASE_URL: ${env:DATABASE_URL}
```

#### SST
```typescript
// sst.config.ts
const api = new Api(stack, "Api", {
  routes: {
    "GET /health": "src/handlers/health.handler",
  },
});

// Environment variables are automatically injected via Resource binding
api.bind([table]); // TABLE_NAME is automatically available
```

### Custom Resources

#### Serverless Framework
```yaml
# serverless.yml
resources:
  Resources:
    MyCustomResource:
      Type: AWS::CloudFormation::CustomResource
      Properties:
        ServiceToken: !GetAtt CustomResourceFunction.Arn
        CustomProperty: value
```

#### SST
```typescript
// sst.config.ts
import { Function } from "sst/constructs";

const customResource = new Function(stack, "CustomResource", {
  handler: "src/custom-resource.handler",
  environment: {
    CUSTOM_PROPERTY: "value",
  },
});
```

## Handler Migration

### Function Signatures

#### Serverless Framework
```typescript
// src/handlers/health.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "healthy" }),
  };
};
```

#### SST
```typescript
// src/handlers/health.ts
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ok } from "../../libs/response";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  return ok({ status: "healthy" });
};
```

### Environment Variable Access

#### Serverless Framework
```typescript
// Access via process.env
const tableName = process.env.TABLE_NAME;
const stage = process.env.STAGE;
```

#### SST
```typescript
// Access via Resource binding (automatic)
const tableName = Resource.Table.name; // Automatically injected
const stage = process.env.SST_STAGE; // SST stage
```

## Data Access Layer Migration

### DynamoDB Client

#### Serverless Framework
```typescript
// src/libs/dynamodb.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const putItem = async (item: any) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: item,
  };
  return await docClient.send(new PutCommand(params));
};
```

#### SST
```typescript
// src/dal/dynamodb.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Table name is automatically injected via Resource binding
const getTableName = () => process.env.TABLE_NAME || "fallback-table";

export const putItem = async (item: any) => {
  const params = {
    TableName: getTableName(),
    Item: item,
  };
  return await docClient.send(new PutCommand(params));
};
```

## Environment Management Migration

### Environment Files

#### Serverless Framework
```yaml
# config/env.yml
common: &common
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: 1

dev:
  <<: *common
  STAGE: dev
  TABLE_NAME: my-app-dev-table

prod:
  <<: *common
  STAGE: prod
  TABLE_NAME: my-app-prod-table
```

#### SST
```bash
# .env.dev
AWS_REGION=eu-north-1
AWS_ACCOUNT=123456789012
STAGE=dev

# .env.prod
AWS_REGION=eu-north-1
AWS_ACCOUNT=123456789012
STAGE=prod
```

### Environment Loading

#### Serverless Framework
```yaml
# serverless.yml
provider:
  environment: ${file(config/env.yml):${self:provider.stage}}
```

#### SST
```typescript
// sst.config.ts
function loadEnvFile(stage: string): Record<string, string> {
  const envFile = `.env.${stage}`;
  const envPath = path.resolve(envFile);
  
  if (!fs.existsSync(envPath)) {
    console.error(`❌ Environment file ${envFile} not found!`);
    process.exit(1);
  }
  
  // Parse and return environment variables
  // ... parsing logic
}

export default {
  stacks(app) {
    app.stack(function Site({ stack }) {
      const stage = stack.stage;
      const envVars = loadEnvFile(stage);
      // ... rest of configuration
    });
  },
};
```

## CI/CD Migration

### Buildspec Files

#### Serverless Framework
```yaml
# buildspec.yml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm install
  pre_build:
    commands:
      - npm run lint
      - npm test
  build:
    commands:
      - npm run deploy:prod
```

#### SST
```yaml
# buildspec.prod.yml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 22  # Updated to Node.js 22
    commands:
      - npm ci
  pre_build:
    commands:
      - npm run lint
      - npm test
  build:
    commands:
      - npm run deploy:prod
```

### Deployment Commands

#### Serverless Framework
```bash
# Deploy
serverless deploy --stage prod

# Remove
serverless remove --stage prod
```

#### SST
```bash
# Deploy
sst deploy --stage prod

# Remove
sst remove --stage prod
```

## Testing Migration

### Test Configuration

#### Serverless Framework
```javascript
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

#### SST
```javascript
// jest.config.unit.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.unit.ts"],
  // No path mapping needed - SST uses relative imports
};
```

### Test Setup

#### Serverless Framework
```typescript
// tests/setup.js
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeAll(() => {
  process.env.TABLE_NAME = "test-table";
  process.env.STAGE = "test";
});
```

#### SST
```typescript
// tests/setup.unit.ts
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const ddbMock = mockClient(DynamoDBDocumentClient);

beforeAll(() => {
  process.env.TABLE_NAME = "test-table";
  process.env.SST_STAGE = "test";
});
```

## Common Migration Challenges

### 1. Plugin Dependencies

**Challenge**: Serverless plugins that don't have SST equivalents.

**Solution**:
- Use AWS CDK constructs for custom resources
- Implement custom logic in Lambda functions
- Use SST's built-in features where possible

### 2. Environment Variable Access

**Challenge**: Different ways of accessing environment variables.

**Solution**:
- Use Resource binding for AWS resources
- Use `process.env` for custom environment variables
- Update environment file structure

### 3. State Management

**Challenge**: SST uses SSM Parameter Store instead of S3.

**Solution**:
- No action needed - SST handles this automatically
- Remove S3 deployment bucket configuration
- Update IAM permissions if needed

### 4. Local Development

**Challenge**: Different local development experience.

**Solution**:
- Use `sst dev` instead of `serverless offline`
- Update development scripts
- Leverage SST's live Lambda development

## Migration Timeline

### Phase 1: Preparation (1-2 weeks)
- Set up SST development environment
- Create parallel SST project structure
- Migrate basic infrastructure configuration

### Phase 2: Core Migration (2-3 weeks)
- Migrate Lambda handlers
- Update data access layer
- Migrate environment management
- Update testing setup

### Phase 3: CI/CD Migration (1 week)
- Update buildspec files
- Configure CodeBuild projects
- Test deployment pipeline

### Phase 4: Testing & Validation (1-2 weeks)
- Comprehensive testing
- Performance validation
- Security review
- Documentation updates

### Phase 5: Production Migration (1 week)
- Deploy to production
- Monitor application performance
- Clean up old resources

## Post-Migration Optimization

### 1. Leverage SST Features
- Use Resource binding for type safety
- Implement live Lambda development
- Use SST's built-in testing support

### 2. Optimize Performance
- Right-size Lambda memory allocation
- Optimize DynamoDB access patterns
- Implement proper caching strategies

### 3. Enhance Security
- Implement proper IAM policies
- Use AWS Secrets Manager for sensitive data
- Enable encryption at rest and in transit

### 4. Improve Monitoring
- Set up CloudWatch alarms
- Implement structured logging
- Use AWS X-Ray for tracing

## Rollback Strategy

If migration issues occur:

1. **Immediate Rollback**: Deploy previous Serverless version
2. **Investigate Issues**: Check logs and metrics
3. **Fix Problems**: Address migration issues
4. **Re-attempt Migration**: Once issues are resolved

## Support Resources

- [SST Documentation](https://docs.sst.dev)
- [SST Discord Community](https://discord.gg/sst)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Migration Examples](https://github.com/sst/examples)

This migration guide provides a comprehensive roadmap for moving from Serverless Framework to SST, ensuring a smooth transition while leveraging SST's modern features and improved developer experience.
