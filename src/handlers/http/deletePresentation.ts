import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { requireAuth } from "@/libs/auth";
import { PresentationRepository } from "@/libs/presentationRepo";
import { notOk400, notOk401, notOk403, notOk404, notOk500, ok } from "@/libs/response";
import { isGoogleAuthConfigured } from "@/libs/secrets";

/**
 * DELETE /presentations/{id}
 * Delete a presentation (only owner can delete)
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Authentication - optional if GOOGLE_CLIENT_ID not configured (dev mode)
    let userEmail = "anonymous@dev.local";
    
    const authEnabled = await isGoogleAuthConfigured();
    if (authEnabled) {
      try {
        const user = await requireAuth(event);
        userEmail = user.email;
      } catch (error) {
        return notOk401("Unauthorized");
      }
    } else {
      console.log("Auth disabled - GOOGLE_CLIENT_ID not configured");
    }

    // Extract presentation ID from path parameters
    const presentationId = event.pathParameters?.id;

    if (!presentationId) {
      return notOk400("Presentation ID is required");
    }

    // Get existing metadata to check ownership
    const existing = await PresentationRepository.getPresentationMetadata(presentationId);

    if (!existing) {
      return notOk404("Presentation not found");
    }

    // Check ownership (skip in dev mode)
    if (authEnabled && existing.userId !== userEmail) {
      return notOk403("Forbidden - you do not own this presentation");
    }

    // Delete the presentation
    await PresentationRepository.deletePresentation(presentationId);

    return ok({ success: true, message: "Presentation deleted" });
  } catch (error) {
    console.error("Error deleting presentation:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to delete presentation"));
  }
};

