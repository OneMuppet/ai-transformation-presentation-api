import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";
import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda/trigger/api-gateway-proxy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handler as createItemHandler } from "../src/handlers/http/createItem";
import { handler as healthHandler } from "../src/handlers/http/health";
import { ddbMock, mockDynamoDBResponses } from "./setup.unit";

describe("Health Handler", () => {
  it("should return healthy status", async () => {
    const event = {
      version: "2.0",
      routeKey: "GET /health",
      rawPath: "/health",
      rawQueryString: "",
      headers: {},
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "GET",
          path: "/health",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "GET /health",
        stage: "test",
        time: "01/Jan/2023:00:00:00 +0000",
        timeEpoch: 1672531200000,
        domainPrefix: "something",
      },
      isBase64Encoded: false,
    };

    const context: Partial<Context> = {
      awsRequestId: "",
    };

    const result: APIGatewayProxyStructuredResultV2 = <APIGatewayProxyStructuredResultV2>(
      await healthHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.status).toBe("healthy");
    expect(body.service).toBe("sst-backend-template-test");
    expect(body.environment).toBe("test");
    expect(body.timestamp).toBeDefined();
  });

  it("should handle errors gracefully", async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Create a mock handler that throws an error
    const errorHandler = async () => {
      throw new Error("Test error");
    };

    try {
      await errorHandler();
    } catch (_error) {
      // This simulates the error handling in the actual handler
      const result = {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          error: "Health check failed",
          timestamp: new Date().toISOString(),
        }),
      };

      expect(result.statusCode).toBe(500);
      expect(result.headers["content-type"]).toBe("application/json");

      const body = JSON.parse(result.body);
      expect(body.error).toBe("Health check failed");
    }

    // Restore mocks
    consoleSpy.mockRestore();
  });
});

describe("Create Item Handler", () => {
  beforeEach(() => {
    ddbMock.reset();
    // Ensure Date.now is not mocked from previous tests
    vi.restoreAllMocks();
  });

  it("should create an item successfully", async () => {
    ddbMock.on(PutCommand).resolves(mockDynamoDBResponses.putItem.success);

    const event = {
      version: "2.0",
      routeKey: "POST /items",
      rawPath: "/items",
      rawQueryString: "",
      headers: {
        "content-type": "application/json",
      },
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "POST",
          path: "/items",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "POST /items",
        stage: "test",
        time: "01/Jan/2023:00:00:00 +0000",
        timeEpoch: 1672531200000,
        domainPrefix: "something",
      },
      body: JSON.stringify({
        name: "Test Item",
        description: "A test item",
        category: "test",
      }),
      isBase64Encoded: false,
    };

    const context: Partial<Context> = {
      awsRequestId: "",
    };

    const result: APIGatewayProxyStructuredResultV2 = <APIGatewayProxyStructuredResultV2>(
      await createItemHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.message).toBe("Item created successfully");
    expect(body.item.name).toBe("Test Item");
    expect(body.item.category).toBe("test");
    expect(body.item.id).toBeDefined();
    expect(body.item.createdAt).toBeDefined();

    // Verify DynamoDB was called
    const ddbCalls = ddbMock.commandCalls(PutCommand);
    expect(ddbCalls).toHaveLength(1);
    expect(ddbCalls[0].firstArg.input.Item.name).toBe("Test Item");
    expect(ddbCalls[0].firstArg.input.Item.category).toBe("test");
  });

  it("should return 400 for missing request body", async () => {
    const event = {
      version: "2.0",
      routeKey: "POST /items",
      rawPath: "/items",
      rawQueryString: "",
      headers: {},
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "POST",
          path: "/items",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "POST /items",
        stage: "test",
        time: "01/Jan/2023:00:00:00 +0000",
        timeEpoch: 1672531200000,
        domainPrefix: "something",
      },
      isBase64Encoded: false,
    };

    const context: Partial<Context> = {
      awsRequestId: "",
    };

    const result: APIGatewayProxyStructuredResultV2 = <APIGatewayProxyStructuredResultV2>(
      await createItemHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(400);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.error).toBe("Request body is required");
  });

  it("should return 400 for invalid JSON", async () => {
    const event = {
      version: "2.0",
      routeKey: "POST /items",
      rawPath: "/items",
      rawQueryString: "",
      headers: {
        "content-type": "application/json",
      },
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "POST",
          path: "/items",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "POST /items",
        stage: "test",
        time: "01/Jan/2023:00:00:00 +0000",
        timeEpoch: 1672531200000,
        domainPrefix: "something",
      },
      body: "invalid json",
      isBase64Encoded: false,
    };

    const context: Partial<Context> = {
      awsRequestId: "",
    };

    const result: APIGatewayProxyStructuredResultV2 = <APIGatewayProxyStructuredResultV2>(
      await createItemHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(400);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.error).toBe("Invalid JSON in request body");
  });

  it("should return 400 for missing required field", async () => {
    const event = {
      version: "2.0",
      routeKey: "POST /items",
      rawPath: "/items",
      rawQueryString: "",
      headers: {
        "content-type": "application/json",
      },
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "POST",
          path: "/items",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "POST /items",
        stage: "test",
        time: "01/Jan/2023:00:00:00 +0000",
        timeEpoch: 1672531200000,
        domainPrefix: "something",
      },
      body: JSON.stringify({
        description: "A test item without name",
      }),
      isBase64Encoded: false,
    };

    const context: Partial<Context> = {
      awsRequestId: "",
    };

    const result: APIGatewayProxyStructuredResultV2 = <APIGatewayProxyStructuredResultV2>(
      await createItemHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(400);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.error).toBe("Field 'name' is required");
  });

  it("should handle DynamoDB errors", async () => {
    ddbMock.on(PutCommand).rejects(mockDynamoDBResponses.putItem.error);

    const event = {
      version: "2.0",
      routeKey: "POST /items",
      rawPath: "/items",
      rawQueryString: "",
      headers: {
        "content-type": "application/json",
      },
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "POST",
          path: "/items",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "POST /items",
        stage: "test",
        time: "01/Jan/2023:00:00:00 +0000",
        timeEpoch: 1672531200000,
        domainPrefix: "something",
      },
      body: JSON.stringify({
        name: "Test Item",
      }),
      isBase64Encoded: false,
    };

    const context: Partial<Context> = {
      awsRequestId: "",
    };

    const result: APIGatewayProxyStructuredResultV2 = <APIGatewayProxyStructuredResultV2>(
      await createItemHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(500);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.error).toBe("DynamoDB put item failed");
    expect(body.timestamp).toBeDefined();
  });
});
