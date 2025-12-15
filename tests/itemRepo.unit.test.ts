import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItemMapper } from "@/libs/itemMapper";
import { ItemRepository } from "@/libs/itemRepo";
import { ddbMock, mockDynamoDBResponses } from "./setup.unit";

describe("ItemRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ddbMock.reset();
  });

  describe("createItem", () => {
    it("should create an item successfully", async () => {
      ddbMock.on(PutCommand).resolves(mockDynamoDBResponses.putItem.success);

      const request = {
        name: "Test Item",
        description: "A test item",
        category: "test",
      };

      const result = await ItemRepository.createItem(request);

      expect(result.name).toBe("Test Item");
      expect(result.description).toBe("A test item");
      expect(result.category).toBe("test");
      expect(result.pk).toBe("ITEMS");
      expect(result.sk).toMatch(/^ITEM#\d+$/);
      expect(result.gsi1pk).toBe("CATEGORY#test");
      expect(result.gsi1sk).toMatch(/^ITEM#\d+$/);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      const ddbCalls = ddbMock.commandCalls(PutCommand);
      expect(ddbCalls).toHaveLength(1);
      expect(ddbCalls[0].firstArg.input.Item.name).toBe("Test Item");
    });

    it("should create an item with default category", async () => {
      ddbMock.on(PutCommand).resolves(mockDynamoDBResponses.putItem.success);

      const request = {
        name: "Test Item",
      };

      const result = await ItemRepository.createItem(request);

      expect(result.category).toBe("default");
      expect(result.gsi1pk).toBe("CATEGORY#default");
    });
  });

  describe("getItemById", () => {
    it("should get an item by ID", async () => {
      const mockItem = {
        pk: "ITEMS",
        sk: "ITEM#123",
        gsi1pk: "CATEGORY#test",
        gsi1sk: "ITEM#123",
        name: "Test Item",
        description: "A test item",
        category: "test",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      };

      ddbMock.on(GetCommand).resolves({
        Item: mockItem,
      });

      const result = await ItemRepository.getItemById("ITEM#123");

      expect(result).toEqual(mockItem);

      const ddbCalls = ddbMock.commandCalls(GetCommand);
      expect(ddbCalls).toHaveLength(1);
      expect(ddbCalls[0].firstArg.input.Key.pk).toBe("ITEMS");
      expect(ddbCalls[0].firstArg.input.Key.sk).toBe("ITEM#123");
    });

    it("should return null when item not found", async () => {
      ddbMock.on(GetCommand).resolves({});

      const result = await ItemRepository.getItemById("ITEM#nonexistent");

      expect(result).toBeNull();
    });

    it("should throw error on database error", async () => {
      ddbMock.on(GetCommand).rejects(new Error("Database error"));

      await expect(ItemRepository.getItemById("ITEM#123")).rejects.toThrow("Failed to get item");
    });
  });

  describe("getItemsByCategory", () => {
    it("should get items by category", async () => {
      const mockItems = [
        {
          pk: "ITEMS",
          sk: "ITEM#1",
          gsi1pk: "CATEGORY#test",
          gsi1sk: "ITEM#1",
          name: "Item 1",
          category: "test",
          createdAt: "2023-01-01T00:00:00.000Z",
          updatedAt: "2023-01-01T00:00:00.000Z",
        },
        {
          pk: "ITEMS",
          sk: "ITEM#2",
          gsi1pk: "CATEGORY#test",
          gsi1sk: "ITEM#2",
          name: "Item 2",
          category: "test",
          createdAt: "2023-01-01T00:00:00.000Z",
          updatedAt: "2023-01-01T00:00:00.000Z",
        },
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockItems,
      });

      const result = await ItemRepository.getItemsByCategory("test");

      expect(result).toEqual(mockItems);

      const ddbCalls = ddbMock.commandCalls(QueryCommand);
      expect(ddbCalls).toHaveLength(1);
      expect(ddbCalls[0].firstArg.input.IndexName).toBe("GSI1");
      expect(ddbCalls[0].firstArg.input.ExpressionAttributeValues[":gsi1pk"]).toBe("CATEGORY#test");
    });

    it("should return empty array when no items found", async () => {
      ddbMock.on(QueryCommand).resolves({});

      const result = await ItemRepository.getItemsByCategory("nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("getAllItems", () => {
    it("should get all items with pagination", async () => {
      const mockItems = [
        {
          pk: "ITEMS",
          sk: "ITEM#1",
          gsi1pk: "CATEGORY#test",
          gsi1sk: "ITEM#1",
          name: "Item 1",
          category: "test",
          createdAt: "2023-01-01T00:00:00.000Z",
          updatedAt: "2023-01-01T00:00:00.000Z",
        },
      ];

      const mockLastEvaluatedKey = { pk: "ITEMS", sk: "ITEM#1" };

      ddbMock.on(QueryCommand).resolves({
        Items: mockItems,
        LastEvaluatedKey: mockLastEvaluatedKey,
      });

      const result = await ItemRepository.getAllItems(10, undefined);

      expect(result.items).toEqual(mockItems);
      expect(result.lastEvaluatedKey).toEqual(mockLastEvaluatedKey);

      const ddbCalls = ddbMock.commandCalls(QueryCommand);
      expect(ddbCalls).toHaveLength(1);
      expect(ddbCalls[0].firstArg.input.Limit).toBe(10);
      expect(ddbCalls[0].firstArg.input.KeyConditionExpression).toBe("pk = :pk");
      expect(ddbCalls[0].firstArg.input.ExpressionAttributeValues[":pk"]).toBe("ITEMS");
    });
  });

  describe("updateItem", () => {
    it("should update an item", async () => {
      const mockUpdatedItem = {
        pk: "ITEMS",
        sk: "ITEM#123",
        gsi1pk: "CATEGORY#test",
        gsi1sk: "ITEM#123",
        name: "Updated Item",
        description: "Updated description",
        category: "test",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T01:00:00.000Z",
      };

      ddbMock.on(UpdateCommand).resolves({});
      ddbMock.on(GetCommand).resolves({
        Item: mockUpdatedItem,
      });

      const request = {
        name: "Updated Item",
        description: "Updated description",
      };

      const result = await ItemRepository.updateItem("ITEM#123", request);

      expect(result).toEqual(mockUpdatedItem);

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0].firstArg.input.Key.pk).toBe("ITEMS");
      expect(updateCalls[0].firstArg.input.Key.sk).toBe("ITEM#123");
    });
  });

  describe("deleteItem", () => {
    it("should delete an item", async () => {
      ddbMock.on(DeleteCommand).resolves({});

      await ItemRepository.deleteItem("ITEM#123");

      const ddbCalls = ddbMock.commandCalls(DeleteCommand);
      expect(ddbCalls).toHaveLength(1);
      expect(ddbCalls[0].firstArg.input.Key.pk).toBe("ITEMS");
      expect(ddbCalls[0].firstArg.input.Key.sk).toBe("ITEM#123");
    });

    it("should throw error on database error", async () => {
      ddbMock.on(DeleteCommand).rejects(new Error("Database error"));

      await expect(ItemRepository.deleteItem("ITEM#123")).rejects.toThrow("Failed to delete item");
    });
  });
});

describe("ItemMapper", () => {
  it("should transform Item to ItemResponse", () => {
    const item = {
      pk: "ITEMS",
      sk: "ITEM#123",
      gsi1pk: "CATEGORY#test",
      gsi1sk: "ITEM#123",
      name: "Test Item",
      description: "A test item",
      category: "test",
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
    };

    const result = ItemMapper.toResponse(item);

    expect(result).toEqual({
      id: "ITEM#123",
      name: "Test Item",
      description: "A test item",
      category: "test",
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
    });
  });

  it("should transform array of Items to ItemResponse array", () => {
    const items = [
      {
        pk: "ITEMS",
        sk: "ITEM#1",
        gsi1pk: "CATEGORY#test",
        gsi1sk: "ITEM#1",
        name: "Item 1",
        category: "test",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      },
      {
        pk: "ITEMS",
        sk: "ITEM#2",
        gsi1pk: "CATEGORY#test",
        gsi1sk: "ITEM#2",
        name: "Item 2",
        category: "test",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      },
    ];

    const result = ItemMapper.toResponseArray(items);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("ITEM#1");
    expect(result[1].id).toBe("ITEM#2");
  });
});
