import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { CreateItemRequest, Item, UpdateItemRequest } from "@/types/item";

/**
 * Item Repository - Handles all Item-related database operations
 *
 * This follows the repository pattern to keep handlers thin and business logic
 * separated from HTTP concerns. This repository handles DynamoDB operations directly.
 */

// Create DynamoDB client
const ddbClient = new DynamoDBClient({});

const marshallOptions = {
  convertEmptyValues: false,
  removeUndefinedValues: true,
  convertClassInstanceToMap: false,
};

const unmarshallOptions = {
  wrapNumbers: false,
};

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions,
  unmarshallOptions,
});

// Get table name from environment variable
const getTableName = (): string => {
  return process.env.TABLE_NAME || "items-table";
};

export class ItemRepository {
  /**
   * Create a new item
   */
  static async createItem(request: CreateItemRequest): Promise<Item> {
    const now = new Date().toISOString();
    const timestamp = Date.now();

    const item: Item = {
      pk: "ITEMS",
      sk: `ITEM#${timestamp}`,
      gsi1pk: `CATEGORY#${request.category || "default"}`,
      gsi1sk: `ITEM#${timestamp}`,
      name: request.name,
      description: request.description || "",
      category: request.category || "default",
      createdAt: now,
      updatedAt: now,
    };

    await ddbDocClient.send(
      new PutCommand({
        TableName: getTableName(),
        Item: item,
      }),
    );
    return item;
  }

  /**
   * Get an item by ID
   */
  static async getItemById(id: string): Promise<Item | null> {
    try {
      const result = await ddbDocClient.send(
        new GetCommand({
          TableName: getTableName(),
          Key: { pk: "ITEMS", sk: id },
        }),
      );

      if (!result.Item) {
        return null;
      }

      return result.Item as Item;
    } catch (error) {
      console.error("Error getting item by ID:", error);
      throw new Error("Failed to get item");
    }
  }

  /**
   * Get an item by name (using sort key)
   */
  static async getItemByName(name: string): Promise<Item | null> {
    try {
      const result = await ddbDocClient.send(
        new QueryCommand({
          TableName: getTableName(),
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
          ExpressionAttributeValues: {
            ":pk": "ITEM#",
            ":sk": `ITEM#${name}`,
          },
          Limit: 1,
        }),
      );

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return result.Items[0] as Item;
    } catch (error) {
      console.error("Error getting item by name:", error);
      throw new Error("Failed to get item by name");
    }
  }

  /**
   * Get all items by category
   */
  static async getItemsByCategory(category: string): Promise<Item[]> {
    try {
      const result = await ddbDocClient.send(
        new QueryCommand({
          TableName: getTableName(),
          IndexName: "GSI1",
          KeyConditionExpression: "gsi1pk = :gsi1pk",
          ExpressionAttributeValues: {
            ":gsi1pk": `CATEGORY#${category}`,
          },
        }),
      );

      return (result.Items || []) as Item[];
    } catch (error) {
      console.error("Error getting items by category:", error);
      throw new Error("Failed to get items by category");
    }
  }

  /**
   * Get all items (with pagination)
   */
  static async getAllItems(
    limit: number = 100,
    lastEvaluatedKey?: any,
  ): Promise<{
    items: Item[];
    lastEvaluatedKey?: any;
  }> {
    try {
      const result = await ddbDocClient.send(
        new QueryCommand({
          TableName: getTableName(),
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: {
            ":pk": "ITEMS",
          },
          Limit: limit,
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      );

      return {
        items: (result.Items || []) as Item[],
        lastEvaluatedKey: result.LastEvaluatedKey,
      };
    } catch (error) {
      console.error("Error getting all items:", error);
      throw new Error("Failed to get all items");
    }
  }

  /**
   * Update an item
   */
  static async updateItem(id: string, request: UpdateItemRequest): Promise<Item> {
    try {
      const now = new Date().toISOString();

      // Build update expression dynamically
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      if (request.name !== undefined) {
        updateExpressions.push("#name = :name");
        expressionAttributeNames["#name"] = "name";
        expressionAttributeValues[":name"] = request.name;
      }

      if (request.description !== undefined) {
        updateExpressions.push("#description = :description");
        expressionAttributeNames["#description"] = "description";
        expressionAttributeValues[":description"] = request.description;
      }

      if (request.category !== undefined) {
        updateExpressions.push("#category = :category");
        expressionAttributeNames["#category"] = "category";
        expressionAttributeValues[":category"] = request.category;
      }

      // Always update the updatedAt timestamp
      updateExpressions.push("#updatedAt = :updatedAt");
      expressionAttributeNames["#updatedAt"] = "updatedAt";
      expressionAttributeValues[":updatedAt"] = now;

      await ddbDocClient.send(
        new UpdateCommand({
          TableName: getTableName(),
          Key: { pk: "ITEMS", sk: id },
          UpdateExpression: `SET ${updateExpressions.join(", ")}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: "ALL_NEW",
        }),
      );

      // Return the updated item
      const updatedItem = await ItemRepository.getItemById(id);
      if (!updatedItem) {
        throw new Error("Item not found after update");
      }

      return updatedItem;
    } catch (error) {
      console.error("Error updating item:", error);
      throw new Error("Failed to update item");
    }
  }

  /**
   * Delete an item
   */
  static async deleteItem(id: string): Promise<void> {
    try {
      await ddbDocClient.send(
        new DeleteCommand({
          TableName: getTableName(),
          Key: { pk: "ITEMS", sk: id },
        }),
      );
    } catch (error) {
      console.error("Error deleting item:", error);
      throw new Error("Failed to delete item");
    }
  }

  /**
   * Search items by name (partial match)
   */
  static async searchItemsByName(searchTerm: string): Promise<Item[]> {
    try {
      const result = await ddbDocClient.send(
        new QueryCommand({
          TableName: getTableName(),
          FilterExpression: "contains(#name, :searchTerm)",
          ExpressionAttributeNames: {
            "#name": "name",
          },
          ExpressionAttributeValues: {
            ":searchTerm": searchTerm,
          },
        }),
      );

      return (result.Items || []) as Item[];
    } catch (error) {
      console.error("Error searching items by name:", error);
      throw new Error("Failed to search items");
    }
  }
}
