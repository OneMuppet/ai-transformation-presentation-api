/**
 * Example Item interface for the single-table design
 * This demonstrates how to structure entities in a DynamoDB single-table design
 */

export interface Item {
  // Primary key attributes
  pk: string; // Partition key (e.g., "ITEM#123", "USER#456")
  sk: string; // Sort key (e.g., "ITEM#name", "USER#profile")

  // GSI1 attributes for alternative access patterns
  gsi1pk: string; // GSI1 partition key (e.g., "ITEM#category", "USER#email")
  gsi1sk: string; // GSI1 sort key (e.g., "ITEM#timestamp", "USER#created")

  // Item-specific attributes
  name: string;
  description?: string;
  category?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  // Optional attributes that can be added as needed
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Example User interface for the same table
 * This shows how multiple entity types can coexist in a single table
 */
export interface User {
  // Primary key attributes
  pk: string; // "USER#123"
  sk: string; // "USER#profile"

  // GSI1 attributes
  gsi1pk: string; // "USER#email@example.com"
  gsi1sk: string; // "USER#created"

  // User-specific attributes
  email: string;
  name: string;
  role: "admin" | "user" | "guest";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;

  // Optional attributes
  preferences?: Record<string, any>;
}

/**
 * Generic entity interface for type safety
 */
export interface BaseEntity {
  pk: string;
  sk: string;
  gsi1pk: string;
  gsi1sk: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Type guard to check if an item is an Item
 */
export const isItem = (entity: any): entity is Item => {
  return (
    entity &&
    typeof entity.pk === "string" &&
    entity.pk.startsWith("ITEM#") &&
    typeof entity.name === "string"
  );
};

/**
 * Type guard to check if an item is a User
 */
export const isUser = (entity: any): entity is User => {
  return (
    entity &&
    typeof entity.pk === "string" &&
    entity.pk.startsWith("USER#") &&
    typeof entity.email === "string"
  );
};

/**
 * Request interfaces for Item operations
 */
export interface CreateItemRequest {
  name: string;
  description?: string | undefined;
  category?: string | undefined;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  category?: string;
}

/**
 * Response interfaces for Item operations
 */
export interface ItemResponse {
  id: string;
  name: string;
  description?: string | undefined;
  category?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemResponse {
  message: string;
  item: ItemResponse;
}

export interface GetItemsResponse {
  items: ItemResponse[];
  lastEvaluatedKey?: any;
}
