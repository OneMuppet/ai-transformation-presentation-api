import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ItemMapper } from "@/libs/itemMapper";
import { ItemRepository } from "@/libs/itemRepo";
import { notOk500, ok } from "@/libs/response";
import type { GetItemsResponse } from "@/types/item";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Extract query parameters
    const category = event.queryStringParameters?.category;
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 100;
    const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey;

    let result: GetItemsResponse;

    if (category) {
      // Get items by category
      const items = await ItemRepository.getItemsByCategory(category);
      result = {
        items: ItemMapper.toResponseArray(items),
      };
    } else {
      // Get all items with pagination
      const paginatedResult = await ItemRepository.getAllItems(limit, lastEvaluatedKey);
      result = {
        items: ItemMapper.toResponseArray(paginatedResult.items),
        lastEvaluatedKey: paginatedResult.lastEvaluatedKey,
      };
    }

    return ok(result);
  } catch (error) {
    console.error("Error getting items:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to get items"));
  }
};
