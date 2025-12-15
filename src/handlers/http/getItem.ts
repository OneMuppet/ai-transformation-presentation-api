import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ItemMapper } from "@/libs/itemMapper";
import { ItemRepository } from "@/libs/itemRepo";
import { notOk404, notOk500, ok } from "@/libs/response";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Extract item ID from path parameters
    const itemId = event.pathParameters?.id;

    if (!itemId) {
      return notOk404("Item ID is required");
    }

    // Get item using repository
    const item = await ItemRepository.getItemById(itemId);

    if (!item) {
      return notOk404("Item not found");
    }

    // Transform to response format
    const itemResponse = ItemMapper.toResponse(item);

    return ok(itemResponse);
  } catch (error) {
    console.error("Error getting item:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to get item"));
  }
};
