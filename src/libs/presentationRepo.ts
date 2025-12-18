import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
  Presentation,
  PresentationMetadata,
  PresentationStatus,
  PresentationTheme,
  Slide,
  SlideItem,
} from "@/types/presentation";

/**
 * Presentation Repository - Handles all Presentation-related database operations
 *
 * Uses a single-table design with the following access patterns:
 * - Get presentation metadata: pk=PRESENTATION#{id}, sk=METADATA
 * - Get all slides: pk=PRESENTATION#{id}, sk begins_with SLIDE#
 * - Get presentations by user: GSI1 gsi1pk=USER#{userId}
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
  return process.env.TABLE_NAME || "presentations";
};

// Helper functions for creating keys
function createPK(presentationId: string): string {
  return `PRESENTATION#${presentationId}`;
}

function createSK(type: "METADATA" | "SLIDE", slideIndex?: number): string {
  if (type === "SLIDE" && slideIndex !== undefined) {
    // Pad slide index to ensure proper sorting (up to 999 slides)
    return `SLIDE#${String(slideIndex).padStart(3, "0")}`;
  }
  return "METADATA";
}

function createGSI1PK(userId: string): string {
  return `USER#${userId}`;
}

function createGSI1SK(presentationId: string): string {
  return `PRESENTATION#${presentationId}`;
}

export class PresentationRepository {
  /**
   * Get full presentation (metadata + all slides)
   */
  static async getPresentation(presentationId: string): Promise<Presentation | null> {
    try {
      // Get metadata
      const metadataResult = await ddbDocClient.send(
        new GetCommand({
          TableName: getTableName(),
          Key: {
            pk: createPK(presentationId),
            sk: createSK("METADATA"),
          },
        }),
      );

      if (!metadataResult.Item) {
        return null;
      }

      const metadata = metadataResult.Item as PresentationMetadata & { pk: string; sk: string };

      // Get all slides
      const slidesResult = await ddbDocClient.send(
        new QueryCommand({
          TableName: getTableName(),
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
          ExpressionAttributeValues: {
            ":pk": createPK(presentationId),
            ":skPrefix": "SLIDE#",
          },
        }),
      );

      const slides: Slide[] = [];
      if (slidesResult.Items) {
        const slideItems = slidesResult.Items as (SlideItem & { pk: string; sk: string })[];
        // Sort by slideIndex to ensure correct order
        slideItems.sort((a, b) => a.slideIndex - b.slideIndex);
        slides.push(...slideItems.map((item) => item.slide));
      }

      return {
        id: metadata.id,
        title: metadata.title,
        description: metadata.description,
        theme: metadata.theme,
        slides,
      };
    } catch (error) {
      console.error("Error getting presentation:", error);
      throw error;
    }
  }

  /**
   * Get presentation metadata only (without slides)
   */
  static async getPresentationMetadata(
    presentationId: string,
  ): Promise<PresentationMetadata | null> {
    try {
      const result = await ddbDocClient.send(
        new GetCommand({
          TableName: getTableName(),
          Key: {
            pk: createPK(presentationId),
            sk: createSK("METADATA"),
          },
        }),
      );

      if (!result.Item) {
        return null;
      }

      // Extract only the metadata fields
      const item = result.Item as PresentationMetadata & { pk: string; sk: string };
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        userId: item.userId,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        theme: item.theme,
        errorMessage: item.errorMessage,
      };
    } catch (error) {
      console.error("Error getting presentation metadata:", error);
      throw error;
    }
  }

  /**
   * Save presentation metadata
   */
  static async savePresentationMetadata(
    metadata: Omit<PresentationMetadata, "createdAt" | "updatedAt">,
  ): Promise<void> {
    try {
      const now = Date.now();

      // Check if it already exists to preserve createdAt
      const existing = await PresentationRepository.getPresentationMetadata(metadata.id);

      const item: PresentationMetadata = {
        ...metadata,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      await ddbDocClient.send(
        new PutCommand({
          TableName: getTableName(),
          Item: {
            pk: createPK(metadata.id),
            sk: createSK("METADATA"),
            gsi1pk: createGSI1PK(metadata.userId),
            gsi1sk: createGSI1SK(metadata.id),
            ...item,
          },
        }),
      );
    } catch (error) {
      console.error("Error saving presentation metadata:", error);
      throw error;
    }
  }

  /**
   * Save a single slide
   */
  static async saveSlide(presentationId: string, slideIndex: number, slide: Slide): Promise<void> {
    try {
      const now = Date.now();
      const item: SlideItem = {
        slideIndex,
        slide,
        updatedAt: now,
      };

      await ddbDocClient.send(
        new PutCommand({
          TableName: getTableName(),
          Item: {
            pk: createPK(presentationId),
            sk: createSK("SLIDE", slideIndex),
            ...item,
          },
        }),
      );
    } catch (error) {
      console.error("Error saving slide:", error);
      throw error;
    }
  }

  /**
   * Batch save multiple slides
   */
  static async saveSlides(presentationId: string, slides: Slide[]): Promise<void> {
    try {
      const now = Date.now();
      const writeRequests = slides.map((slide, index) => ({
        PutRequest: {
          Item: {
            pk: createPK(presentationId),
            sk: createSK("SLIDE", index),
            slideIndex: index,
            slide,
            updatedAt: now,
          },
        },
      }));

      // DynamoDB batch write limit is 25 items
      for (let i = 0; i < writeRequests.length; i += 25) {
        const batch = writeRequests.slice(i, i + 25);
        const result = await ddbDocClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [getTableName()]: batch,
            },
          }),
        );

        // Handle unprocessed items (retry if needed)
        if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
          console.warn("Some items were not processed, retrying...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await ddbDocClient.send(
            new BatchWriteCommand({
              RequestItems: result.UnprocessedItems,
            }),
          );
        }
      }
    } catch (error) {
      console.error("Error saving slides:", error);
      throw error;
    }
  }

  /**
   * Update presentation status
   */
  static async updatePresentationStatus(
    presentationId: string,
    status: PresentationStatus,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const updateExpression: string[] = ["SET #status = :status", "updatedAt = :updatedAt"];
      const expressionAttributeNames: Record<string, string> = {
        "#status": "status",
      };
      const expressionAttributeValues: Record<string, unknown> = {
        ":status": status,
        ":updatedAt": Date.now(),
      };

      if (errorMessage) {
        updateExpression.push("errorMessage = :errorMessage");
        expressionAttributeValues[":errorMessage"] = errorMessage;
      }

      await ddbDocClient.send(
        new UpdateCommand({
          TableName: getTableName(),
          Key: {
            pk: createPK(presentationId),
            sk: createSK("METADATA"),
          },
          UpdateExpression: updateExpression.join(", "),
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        }),
      );
    } catch (error) {
      console.error("Error updating presentation status:", error);
      throw error;
    }
  }

  /**
   * Update presentation metadata (title, description, theme)
   */
  static async updatePresentationMetadata(
    presentationId: string,
    updates: {
      title?: string;
      description?: string;
      theme?: PresentationTheme;
    },
  ): Promise<void> {
    try {
      const updateExpressions: string[] = ["updatedAt = :updatedAt"];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {
        ":updatedAt": Date.now(),
      };

      if (updates.title !== undefined) {
        updateExpressions.push("#title = :title");
        expressionAttributeNames["#title"] = "title";
        expressionAttributeValues[":title"] = updates.title;
      }

      if (updates.description !== undefined) {
        updateExpressions.push("#description = :description");
        expressionAttributeNames["#description"] = "description";
        expressionAttributeValues[":description"] = updates.description;
      }

      if (updates.theme !== undefined) {
        updateExpressions.push("#theme = :theme");
        expressionAttributeNames["#theme"] = "theme";
        expressionAttributeValues[":theme"] = updates.theme;
      }

      await ddbDocClient.send(
        new UpdateCommand({
          TableName: getTableName(),
          Key: {
            pk: createPK(presentationId),
            sk: createSK("METADATA"),
          },
          UpdateExpression: `SET ${updateExpressions.join(", ")}`,
          ExpressionAttributeNames:
            Object.keys(expressionAttributeNames).length > 0
              ? expressionAttributeNames
              : undefined,
          ExpressionAttributeValues: expressionAttributeValues,
        }),
      );
    } catch (error) {
      console.error("Error updating presentation metadata:", error);
      throw error;
    }
  }

  /**
   * Get all presentations for a user
   */
  static async getUserPresentations(userId: string): Promise<PresentationMetadata[]> {
    try {
      const result = await ddbDocClient.send(
        new QueryCommand({
          TableName: getTableName(),
          IndexName: "GSI1",
          KeyConditionExpression: "gsi1pk = :gsi1pk",
          ExpressionAttributeValues: {
            ":gsi1pk": createGSI1PK(userId),
          },
        }),
      );

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      // The items from GSI1 should have all the metadata fields
      const presentations = result.Items as (PresentationMetadata & {
        pk: string;
        sk: string;
        gsi1pk: string;
        gsi1sk: string;
      })[];

      // Sort by createdAt descending (newest first)
      return presentations
        .map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          userId: item.userId,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          theme: item.theme,
          errorMessage: item.errorMessage,
        }))
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Error getting user presentations:", error);
      throw error;
    }
  }

  /**
   * Delete a presentation (metadata + all slides)
   */
  static async deletePresentation(presentationId: string): Promise<void> {
    try {
      // First, get all items for this presentation
      const queryResult = await ddbDocClient.send(
        new QueryCommand({
          TableName: getTableName(),
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: {
            ":pk": createPK(presentationId),
          },
        }),
      );

      if (!queryResult.Items || queryResult.Items.length === 0) {
        return;
      }

      // Delete all items in batches
      const deleteRequests = queryResult.Items.map((item) => ({
        DeleteRequest: {
          Key: {
            pk: item.pk,
            sk: item.sk,
          },
        },
      }));

      for (let i = 0; i < deleteRequests.length; i += 25) {
        const batch = deleteRequests.slice(i, i + 25);
        await ddbDocClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [getTableName()]: batch,
            },
          }),
        );
      }
    } catch (error) {
      console.error("Error deleting presentation:", error);
      throw error;
    }
  }
}

