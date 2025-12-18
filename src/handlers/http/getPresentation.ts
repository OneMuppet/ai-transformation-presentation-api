import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { PresentationRepository } from "@/libs/presentationRepo";
import { notOk400, notOk404, notOk500, ok } from "@/libs/response";

/**
 * GET /presentations/{id}
 * Get a presentation by ID (public endpoint - no auth required for viewing)
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Extract presentation ID from path parameters
    const presentationId = event.pathParameters?.id;

    if (!presentationId) {
      return notOk400("Presentation ID is required");
    }

    // Get full presentation (metadata + slides)
    const presentation = await PresentationRepository.getPresentation(presentationId);

    if (!presentation) {
      return notOk404("Presentation not found");
    }

    return ok(presentation);
  } catch (error) {
    console.error("Error getting presentation:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to get presentation"));
  }
};

