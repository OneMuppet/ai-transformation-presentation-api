# 🏗️ Architectural Patterns & Guidelines

This document outlines the architectural patterns and guidelines for AI agents working on this SST.dev backend template.

## 📁 File Organization

```
src/
├── handlers/http/     # Thin HTTP handlers (parsing, validation, response)
├── libs/             # Business logic (repositories, mappers, utilities, validation)
└── types/            # TypeScript interfaces and types
```

## 📝 Handler Pattern

### ✅ What Handlers Should Do
- **Parse HTTP requests** - Extract data from event, path parameters, query strings
- **Validate input** - Use ValidationUtils for common patterns
- **Call business logic** - Delegate to repositories and services
- **Format responses** - Use mappers to transform entities to API responses
- **Handle errors** - Return appropriate HTTP status codes

### ❌ What Handlers Should NOT Do
- **Business logic** - Keep handlers thin, move logic to libs/
- **Direct database calls** - Use repositories instead
- **Complex validation** - Use ValidationUtils or move to libs/
- **Response transformation** - Use mappers instead

### Example Handler Structure
```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // 1. Parse and validate request
    const requestData = ValidationUtils.parseAndValidateCreateItemRequest(event.body ?? null);
    
    // 2. Call business logic
    const item = await ItemRepository.createItem(requestData);
    
    // 3. Transform response
    const itemResponse = ItemMapper.toResponse(item);
    
    // 4. Return HTTP response
    return ok({ message: "Item created successfully", item: itemResponse });
  } catch (error) {
    // 5. Handle errors appropriately
    if (error instanceof ValidationError) {
      return notOk400(error.message);
    }
    return notOk500(error instanceof Error ? error : new Error("Failed to create item"));
  }
};
```

## 🗄️ Repository Pattern

### Structure
```typescript
export class SomeRepository {
  // DynamoDB client setup
  private static readonly ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  private static readonly TABLE_NAME = process.env.TABLE_NAME || "table-name";

  static async createItem(request: CreateRequest): Promise<Entity> {
    // 1. Build entity from request
    // 2. Call DynamoDB directly
    // 3. Return entity
  }

  static async getItemById(id: string): Promise<Entity | null> {
    // 1. Call DynamoDB directly
    // 2. Handle not found cases
    // 3. Return entity or null
  }
}
```

### ✅ What Repositories Should Do
- **Encapsulate business logic** - All entity-related operations
- **Handle DynamoDB operations** - Direct AWS SDK calls are OK
- **Use static methods** - Repositories are stateless utility classes
- **Throw descriptive errors** - "Failed to create item" not just "Error"
- **Log errors with context** - Include relevant data in error logs
- **Return entities or null** - Don't return HTTP responses

### ❌ What Repositories Should NOT Do
- **HTTP status codes** - Throw errors, don't return status codes
- **Request/response objects** - Work with entities and requests only
- **Complex business rules** - Keep focused on data operations

## 🗺️ Mapper Pattern

### Purpose
Transform between internal entities and API response formats.

### Structure
```typescript
export class SomeMapper {
  static toResponse(entity: Entity): EntityResponse {
    return {
      id: entity.id,
      name: entity.name,
      createdAt: entity.createdAt,
      // Transform internal fields to API-friendly format
    };
  }

  static toEntity(request: CreateRequest): Entity {
    return {
      id: generateId(),
      name: request.name,
      createdAt: new Date().toISOString(),
      // Transform API request to internal entity
    };
  }
}
```

## ✅ Validation Pattern

### Use ValidationUtils for common validation patterns
```typescript
// Use ValidationUtils for common validation patterns
const requestData = ValidationUtils.parseAndValidateCreateItemRequest(event.body);

// Or create custom validation functions in libs/validation.ts
function parseAndValidateRequest(event: any): SomeRequest {
  // Parse JSON
  // Validate required fields
  // Return typed request object
  // Throw errors for validation failures
}
```

### ValidationUtils Structure
```typescript
export class ValidationUtils {
  static parseAndValidateCreateItemRequest(body: string | null): CreateItemRequest {
    if (!body) {
      throw new Error("Request body is required");
    }

    let requestData;
    try {
      requestData = JSON.parse(body);
    } catch (parseError) {
      throw new Error("Invalid JSON in request body");
    }

    if (!requestData.name || typeof requestData.name !== "string") {
      throw new Error("Field 'name' is required and must be a string");
    }

    return {
      name: requestData.name,
      description: requestData.description,
      category: requestData.category,
    };
  }
}
```

## 📋 When Creating New Features

1. **Create types** in `types/` directory
2. **Create repository** in `libs/` directory (with DynamoDB operations)
3. **Create mapper** in `libs/` directory
4. **Add validation** to `libs/validation.ts` if needed
5. **Create handler** in `handlers/http/` directory
6. **Add route** in `sst.config.ts`
7. **Write tests** in `tests/` directory

## 🧪 Testing Patterns

### Handler Tests
- Mock repositories and mappers
- Test HTTP status codes and response formats
- Test error handling scenarios

### Repository Tests
- Mock DynamoDB commands directly
- Test business logic and error handling
- Use `aws-sdk-client-mock` for AWS SDK mocking

### Test Structure
```typescript
// Mock the repository
jest.mock('@/libs/itemRepo');
const mockItemRepo = ItemRepository as jest.Mocked<typeof ItemRepository>;

// Test the handler
describe('createItem handler', () => {
  it('should create item successfully', async () => {
    // Arrange
    const mockItem = { id: '1', name: 'Test Item' };
    mockItemRepo.createItem.mockResolvedValue(mockItem);

    // Act
    const result = await handler(mockEvent);

    // Assert
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: "Item created successfully",
      item: mockItem
    });
  });
});
```

## 🔧 Import Patterns

### Use @ notation for clean imports
```typescript
// ✅ Good - use @ notation
import { ItemRepository } from "@/libs/itemRepo";
import { ItemMapper } from "@/libs/itemMapper";
import { ValidationUtils } from "@/libs/validation";
import { ok, notOk400 } from "@/libs/response";

// ❌ Avoid - relative imports
import { ItemRepository } from "../../libs/itemRepo";
```

## 🎯 Key Principles

1. **Separation of Concerns** - Each layer has a single responsibility
2. **Thin Handlers** - Keep HTTP handlers focused on HTTP concerns
3. **Rich Repositories** - Business logic lives in repositories
4. **Type Safety** - Use TypeScript interfaces throughout
5. **Error Handling** - Consistent error handling patterns
6. **Testability** - Design for easy testing and mocking
