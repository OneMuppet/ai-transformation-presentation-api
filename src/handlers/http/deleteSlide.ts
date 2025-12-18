import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { requireAuth } from "@/libs/auth";
import { PresentationRepository } from "@/libs/presentationRepo";
import { notOk400, notOk401, notOk403, notOk404, notOk500, ok } from "@/libs/response";
import { isGoogleAuthConfigured } from "@/libs/secrets";

interface DeleteSlideResponse {
  success: boolean;
  message: string;
}

/**
 * DELETE /presentations/{id}/slides/{index}
 * Delete a slide from a presentation
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

    // Extract path parameters
    const presentationId = event.pathParameters?.id;
    const slideIndexStr = event.pathParameters?.index;

    if (!presentationId) {
      return notOk400("Presentation ID is required");
    }

    if (!slideIndexStr) {
      return notOk400("Slide index is required");
    }

    const slideIndex = Number.parseInt(slideIndexStr, 10);
    if (Number.isNaN(slideIndex) || slideIndex < 0) {
      return notOk400("Invalid slide index");
    }

    // Get presentation metadata to check ownership
    const metadata = await PresentationRepository.getPresentationMetadata(presentationId);

    if (!metadata) {
      return notOk404("Presentation not found");
    }

    // Check ownership (skip in dev mode)
    if (authEnabled && metadata.userId !== userEmail) {
      return notOk403("Forbidden - you do not own this presentation");
    }

    // Get full presentation
    const presentation = await PresentationRepository.getPresentation(presentationId);

    if (!presentation) {
      return notOk404("Presentation not found");
    }

    // Check if slide index is valid
    if (slideIndex >= presentation.slides.length) {
      return notOk400(`Slide index out of range (max: ${presentation.slides.length - 1})`);
    }

    // Prevent deleting the last slide
    if (presentation.slides.length <= 1) {
      return notOk400("Cannot delete the last slide in a presentation");
    }

    // Remove slide from array
    presentation.slides.splice(slideIndex, 1);

    // Re-save all slides with updated indices
    await PresentationRepository.saveSlides(presentationId, presentation.slides);

    const response: DeleteSlideResponse = {
      success: true,
      message: `Slide ${slideIndex} deleted successfully`,
    };

    return ok(response);
  } catch (error) {
    console.error("Error deleting slide:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to delete slide"));
  }
};

