# External Authorizer Guide

This guide explains how to use existing Lambda authorizer functions with your SST API Gateway V2 endpoints by referencing them via ARN.

## Overview

This template supports external authorization using existing Lambda authorizer functions:

1. **External Lambda Authorizer** - Reference existing authorizer functions by ARN
2. **JWT Authorizer** - JSON Web Token validation
3. **IAM Authorization** - AWS IAM-based authorization

## External Lambda Authorizer

### 1. Prerequisites

Before using an external authorizer, you need:

- An existing Lambda function that implements the API Gateway authorizer interface
- The ARN of your authorizer function
- Proper IAM permissions for API Gateway to invoke your authorizer

### 2. Configure the External Authorizer in SST

In your `sst.config.ts`, uncomment and configure the external authorizer:

```typescript
// Add external custom authorizer by ARN
const externalAuthorizer = api.addAuthorizer("ExternalAuthorizer", {
  lambda: {
    functionArn: envVars.AUTHORIZER_ARN, // ARN of your existing authorizer function
    identitySources: ["$request.header.Authorization"],
    ttl: "3600 seconds" // Cache authorization for 1 hour
  }
});
```

### 3. Environment Configuration

Add the authorizer ARN to your `.env.{stage}` file:

```bash
# External Authorizer ARN
AUTHORIZER_ARN=arn:aws:lambda:eu-north-1:123456789012:function:my-existing-authorizer
```

### 4. Protect Routes with the External Authorizer

```typescript
// Protect a route with the external authorizer
api.route("POST /items", {
  handler: "src/handlers/http/createItem.handler",
  link: [table],
  environment: {
    TABLE_NAME: table.name,
  },
  auth: {
    lambda: externalAuthorizer.id
  }
});
```

### 5. Access User Context in Handlers

When using an external Lambda authorizer, the user context is available in your handlers:

```typescript
// In your handler
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  
  const userId = event.requestContext.authorizer?.userId;
  const userEmail = event.requestContext.authorizer?.email;
  const userRole = event.requestContext.authorizer?.role;
  
  console.log(`Request from user: ${userId} (${userEmail}) with role: ${userRole}`);
  
  // Your handler logic here
};
```

## JWT Authorizer

### 1. Configure JWT Authorizer

```typescript
// Add JWT authorizer
const jwtAuthorizer = api.addAuthorizer("JWTAuthorizer", {
  jwt: {
    issuer: envVars.JWT_ISSUER || "https://your-auth-provider.com",
    audiences: [envVars.JWT_AUDIENCE || "your-api-audience"],
    identitySource: "$request.header.Authorization"
  }
});
```

### 2. Protect Routes with JWT

```typescript
// Protect a route with JWT authorizer
api.route("GET /profile", {
  handler: "src/handlers/http/profile.handler",
  auth: {
    jwt: {
      authorizer: jwtAuthorizer.id,
      scopes: ["read:profile"] // Optional: require specific scopes
    }
  }
});
```

## IAM Authorization

For AWS IAM-based authorization:

```typescript
// Protect a route with IAM authorization
api.route("GET /admin", {
  handler: "src/handlers/http/admin.handler",
  auth: {
    iam: true // Requires AWS IAM credentials
  }
});
```

## Environment Variables

Add these to your `.env.{stage}` files:

```bash
# External Authorizer Configuration
AUTHORIZER_ARN=arn:aws:lambda:eu-north-1:123456789012:function:my-existing-authorizer

# JWT Configuration (if using JWT authorizer)
JWT_ISSUER=https://your-auth-provider.com
JWT_AUDIENCE=your-api-audience

# Secrets Manager IDs (optional)
SECRETS_ID=your-secrets-manager-secret-id
```

## External Authorizer Requirements

### Lambda Function Interface

Your external authorizer function must implement the API Gateway Lambda authorizer interface:

```typescript
// Example authorizer function structure
export const handler = async (event: APIGatewayRequestAuthorizerEventV2) => {
  // Extract token from event
  const token = event.headers?.authorization;
  
  // Validate token (your custom logic)
  const isValid = await validateToken(token);
  
  if (isValid) {
    return {
      isAuthorized: true,
      context: {
        userId: "user-123",
        email: "user@example.com",
        role: "user"
      }
    };
  } else {
    return {
      isAuthorized: false
    };
  }
};
```

### IAM Permissions

Your authorizer function needs the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

API Gateway automatically gets permission to invoke your authorizer function when you configure it in SST.

## Cross-Account Authorizers

To use an authorizer from a different AWS account:

1. **Ensure the authorizer function exists** in the target account
2. **Grant API Gateway permission** to invoke the function across accounts
3. **Use the full ARN** including the account ID

```typescript
// Cross-account authorizer
const crossAccountAuthorizer = api.addAuthorizer("CrossAccountAuthorizer", {
  lambda: {
    functionArn: "arn:aws:lambda:eu-north-1:987654321098:function:their-authorizer",
    identitySources: ["$request.header.Authorization"],
    ttl: "3600 seconds"
  }
});
```

## Testing External Authorizers

### 1. Test with Valid Token

```bash
curl -X POST https://your-api-url/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-valid-token" \
  -d '{"name": "Test Item"}'
```

### 2. Test with Invalid Token

```bash
curl -X POST https://your-api-url/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{"name": "Test Item"}'
```

### 3. Test without Token

```bash
curl -X POST https://your-api-url/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item"}'
```

## Troubleshooting

### Common Issues

1. **Authorizer Not Found**
   - Verify the ARN is correct
   - Ensure the function exists in the specified region
   - Check that the function is deployed

2. **Permission Denied**
   - Verify API Gateway has permission to invoke the authorizer
   - Check IAM roles and policies
   - Ensure the authorizer function has proper permissions

3. **Timeout Errors**
   - Check authorizer function timeout settings
   - Verify the function is not taking too long to respond
   - Consider increasing the timeout in your authorizer function

4. **Context Not Available**
   - Ensure your authorizer returns the `context` object
   - Verify the context keys match what your handlers expect
   - Check that the authorizer is returning `isAuthorized: true`

### Debugging Tips

1. **Check CloudWatch Logs** for your authorizer function
2. **Use SST dev mode** to test locally with breakpoints
3. **Verify the authorizer response format** matches API Gateway expectations
4. **Test the authorizer function directly** using the AWS Lambda console

## Best Practices

1. **Use TTL Caching** to improve performance and reduce costs
2. **Implement Proper Error Handling** in your authorizer function
3. **Log Authorization Events** for security monitoring
4. **Use Environment Variables** for configuration
5. **Test Thoroughly** with different token scenarios
6. **Monitor Performance** and adjust timeout settings as needed

## Example: Complete Setup

Here's a complete example of setting up an external authorizer:

### 1. Environment File (`.env.dev`)

```bash
AWS_REGION=eu-north-1
AWS_ACCOUNT=123456789012
AUTHORIZER_ARN=arn:aws:lambda:eu-north-1:123456789012:function:my-auth-service
```

### 2. SST Configuration (`sst.config.ts`)

```typescript
// Add external authorizer
const externalAuthorizer = api.addAuthorizer("ExternalAuthorizer", {
  lambda: {
    functionArn: envVars.AUTHORIZER_ARN,
    identitySources: ["$request.header.Authorization"],
    ttl: "3600 seconds"
  }
});

// Protect routes
api.route("POST /items", {
  handler: "src/handlers/http/createItem.handler",
  link: [table],
  environment: {
    TABLE_NAME: table.name,
  },
  auth: {
    lambda: externalAuthorizer.id
  }
});
```

### 3. Handler Usage

```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = event.requestContext.authorizer?.userId;
  const userRole = event.requestContext.authorizer?.role;
  
  // Your business logic here
  return ok({ message: "Item created", userId, userRole });
};
```

This setup provides a clean, maintainable way to use existing authorizer functions with your SST application.