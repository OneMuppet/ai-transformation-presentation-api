import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ItemMapper } from "@/libs/itemMapper";
import { ItemRepository } from "@/libs/itemRepo";
import { notOk400, notOk500, ok } from "@/libs/response";
import { ValidationUtils } from "@/libs/validation";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Parse and validate request body
    const requestData = ValidationUtils.parseAndValidateCreateItemRequest(event.body ?? null);

    // Create item using repository
    const item = await ItemRepository.createItem(requestData);

    // Transform to response format
    const itemResponse = ItemMapper.toResponse(item);

    return ok({
      message: "Item created successfully",
      item: itemResponse,
    });
  } catch (error) {
    console.error("Error creating item:", error);

    // Handle validation errors with 400 status
    if (
      error instanceof Error &&
      (error.message.includes("Request body is required") ||
        error.message.includes("Invalid JSON") ||
        error.message.includes("Field 'name' is required"))
    ) {
      return notOk400(error.message);
    }

    // Handle other errors with 500 status
    return notOk500(error instanceof Error ? error : new Error("Failed to create item"));
  }
};
