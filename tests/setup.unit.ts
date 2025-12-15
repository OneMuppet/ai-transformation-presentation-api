import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

// Mock AWS SDK clients
export const ddbMock = mockClient(DynamoDBDocumentClient);
export const secretsMock = mockClient(SecretsManagerClient);

// Set up test environment variables
process.env.TABLE_NAME = "test-table";
process.env.SST_STAGE = "test";
process.env.AWS_REGION = "eu-north-1";

// Global test setup
beforeAll(() => {
  // Reset all mocks before each test suite
  ddbMock.reset();
  secretsMock.reset();
});

beforeEach(() => {
  // Reset mocks before each test
  ddbMock.reset();
  secretsMock.reset();
});

afterAll(() => {
  // Clean up after all tests
  ddbMock.restore();
  secretsMock.restore();
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Example mock implementations for common scenarios
export const mockDynamoDBResponses = {
  putItem: {
    success: {},
    error: new Error("DynamoDB put item failed"),
  },
  getItem: {
    success: {
      Item: {
        pk: "ITEM#123",
        sk: "ITEM#test",
        name: "Test Item",
        createdAt: "2023-01-01T00:00:00.000Z",
      },
    },
    notFound: {},
    error: new Error("DynamoDB get item failed"),
  },
  query: {
    success: {
      Items: [
        {
          pk: "ITEM#123",
          sk: "ITEM#test1",
          name: "Test Item 1",
        },
        {
          pk: "ITEM#456",
          sk: "ITEM#test2",
          name: "Test Item 2",
        },
      ],
      Count: 2,
    },
    empty: {
      Items: [],
      Count: 0,
    },
    error: new Error("DynamoDB query failed"),
  },
};

/*export const mockSecretsManagerResponses = {
  getSecret: {
    success: {
      SecretString: JSON.stringify({
        username: "testuser",
        password: "testpass",
        host: "localhost",
        port: 5432,
        database: "testdb",
      }),
    },
    error: new Error("Secrets Manager get secret failed"),
  },
};*/
