import { beforeEach, describe, expect, it, type MockedFunction, vi } from "vitest";
import { handler as getItemHandler } from "../src/handlers/http/getItem";
import { handler as getItemsHandler } from "../src/handlers/http/getItems";

// Mock the repository and mapper
vi.mock("../src/libs/itemRepo", () => ({
  ItemRepository: {
    getItemById: vi.fn(),
    getItemsByCategory: vi.fn(),
    getAllItems: vi.fn(),
  },
}));

vi.mock("../src/libs/itemMapper", () => ({
  ItemMapper: {
    toResponse: vi.fn(),
    toResponseArray: vi.fn(),
  },
}));

import type { APIGatewayProxyEventV2, Context } from "aws-lambda";
import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda/trigger/api-gateway-proxy";
import { ItemMapper } from "@/libs/itemMapper";
import { ItemRepository } from "@/libs/itemRepo";

const mockGetItemById = ItemRepository.getItemById as MockedFunction<
  typeof ItemRepository.getItemById
>;
const mockGetItemsByCategory = ItemRepository.getItemsByCategory as MockedFunction<
  typeof ItemRepository.getItemsByCategory
>;
const mockGetAllItems = ItemRepository.getAllItems as MockedFunction<
  typeof ItemRepository.getAllItems
>;
const mockToResponse = ItemMapper.toResponse as MockedFunction<typeof ItemMapper.toResponse>;
const mockToResponseArray = ItemMapper.toResponseArray as MockedFunction<
  typeof ItemMapper.toResponseArray
>;

describe("Get Item Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get an item successfully", async () => {
    const mockItem = {
      pk: "ITEM#123",
      sk: "ITEM#Test Item",
      gsi1pk: "ITEM#test",
      gsi1sk: "ITEM#123",
      name: "Test Item",
      description: "A test item",
      category: "test",
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
    };

    const mockResponse = {
      id: "ITEM#123",
      name: "Test Item",
      description: "A test item",
      category: "test",
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
    };

    mockGetItemById.mockResolvedValue(mockItem);
    mockToResponse.mockReturnValue(mockResponse);

    const event: APIGatewayProxyEventV2 = {
      version: "2.0",
      routeKey: "GET /items/{id}",
      rawPath: "/items/ITEM%23123",
      rawQueryString: "",
      headers: {},
      pathParameters: {
        id: "ITEM#123",
      },
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "GET",
          path: "/items/ITEM#123",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "GET /items/{id}",
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
      await getItemHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body).toEqual(mockResponse);
    expect(mockGetItemById).toHaveBeenCalledWith("ITEM#123");
    expect(mockToResponse).toHaveBeenCalledWith(mockItem);
  });

  it("should return 404 when item not found", async () => {
    mockGetItemById.mockResolvedValue(null);

    const event = {
      version: "2.0",
      routeKey: "GET /items/{id}",
      rawPath: "/items/ITEM%23nonexistent",
      rawQueryString: "",
      headers: {},
      pathParameters: {
        id: "ITEM#nonexistent",
      },
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "GET",
          path: "/items/ITEM#nonexistent",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "GET /items/{id}",
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
      await getItemHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(404);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.error).toBe("Item not found");
  });

  it("should return 404 when item ID is missing", async () => {
    const event = {
      version: "2.0",
      routeKey: "GET /items/{id}",
      rawPath: "/items/",
      rawQueryString: "",
      headers: {},
      pathParameters: {},
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "GET",
          path: "/items/",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "GET /items/{id}",
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
      await getItemHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(404);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.error).toBe("Item ID is required");
  });

  it("should handle repository errors", async () => {
    mockGetItemById.mockRejectedValue(new Error("Database error"));

    const event = {
      version: "2.0",
      routeKey: "GET /items/{id}",
      rawPath: "/items/ITEM%23123",
      rawQueryString: "",
      headers: {},
      pathParameters: {
        id: "ITEM#123",
      },
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "GET",
          path: "/items/ITEM#123",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "GET /items/{id}",
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
      await getItemHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(500);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.error).toBe("Database error");
  });
});

describe("Get Items Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get all items successfully", async () => {
    const mockItems = [
      {
        pk: "ITEM#1",
        sk: "ITEM#Item 1",
        gsi1pk: "ITEM#test",
        gsi1sk: "ITEM#1",
        name: "Item 1",
        category: "test",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      },
    ];

    const mockResponse = [
      {
        id: "ITEM#1",
        name: "Item 1",
        category: "test",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      },
    ];

    mockGetAllItems.mockResolvedValue({
      items: mockItems,
      lastEvaluatedKey: { pk: "ITEM#1" },
    });
    mockToResponseArray.mockReturnValue(mockResponse);

    const event = {
      version: "2.0",
      routeKey: "GET /items",
      rawPath: "/items",
      rawQueryString: "",
      headers: {},
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "GET",
          path: "/items",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "GET /items",
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
      await getItemsHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.items).toEqual(mockResponse);
    expect(body.lastEvaluatedKey).toEqual({ pk: "ITEM#1" });
    expect(mockGetAllItems).toHaveBeenCalledWith(100, undefined);
  });

  it("should get items by category", async () => {
    const mockItems = [
      {
        pk: "ITEM#1",
        sk: "ITEM#Item 1",
        gsi1pk: "ITEM#test",
        gsi1sk: "ITEM#1",
        name: "Item 1",
        category: "test",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      },
    ];

    const mockResponse = [
      {
        id: "ITEM#1",
        name: "Item 1",
        category: "test",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      },
    ];

    mockGetItemsByCategory.mockResolvedValue(mockItems);
    mockToResponseArray.mockReturnValue(mockResponse);

    const event = {
      version: "2.0",
      routeKey: "GET /items",
      rawPath: "/items",
      rawQueryString: "category=test",
      headers: {},
      queryStringParameters: {
        category: "test",
      },
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "GET",
          path: "/items",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "GET /items",
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
      await getItemsHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.items).toEqual(mockResponse);
    expect(body.lastEvaluatedKey).toBeUndefined();
    expect(mockGetItemsByCategory).toHaveBeenCalledWith("test");
  });

  it("should handle custom limit parameter", async () => {
    const mockItems: any[] = [];
    const mockResponse: any[] = [];

    mockGetAllItems.mockResolvedValue({
      items: mockItems,
    });
    mockToResponseArray.mockReturnValue(mockResponse);

    const event = {
      version: "2.0",
      routeKey: "GET /items",
      rawPath: "/items",
      rawQueryString: "limit=10",
      headers: {},
      queryStringParameters: {
        limit: "10",
      },
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "GET",
          path: "/items",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "GET /items",
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
      await getItemsHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(200);
    expect(mockGetAllItems).toHaveBeenCalledWith(10, undefined);
  });

  it("should handle repository errors", async () => {
    mockGetAllItems.mockRejectedValue(new Error("Database error"));

    const event = {
      version: "2.0",
      routeKey: "GET /items",
      rawPath: "/items",
      rawQueryString: "",
      headers: {},
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        domainName: "test.execute-api.eu-north-1.amazonaws.com",
        http: {
          method: "GET",
          path: "/items",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "test",
        },
        requestId: "test-request-id",
        routeKey: "GET /items",
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
      await getItemsHandler(event, <Context>context, () => {})
    );

    expect(result.statusCode).toBe(500);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body || "{}");
    expect(body.error).toBe("Database error");
  });
});
