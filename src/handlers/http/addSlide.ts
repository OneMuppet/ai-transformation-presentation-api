import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { requireAuth } from "@/libs/auth";
import { generateSlide } from "@/libs/openai";
import { PresentationRepository } from "@/libs/presentationRepo";
import { notOk400, notOk401, notOk403, notOk404, notOk500, ok } from "@/libs/response";
import { isGoogleAuthConfigured } from "@/libs/secrets";
import type { Slide } from "@/types/presentation";

interface AddSlideRequest {
  instruction: string;
  position: number; // Position to insert the slide (0-based index)
  slideType?: string; // Optional: specific slide type to generate
}

interface AddSlideResponse {
  success: boolean;
  slide: Slide;
  slideIndex: number;
}

/**
 * POST /presentations/{id}/slides
 * Add a new slide using AI based on user instruction
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

    if (!presentationId) {
      return notOk400("Presentation ID is required");
    }

    // Parse request body
    if (!event.body) {
      return notOk400("Request body is required");
    }

    let body: AddSlideRequest;
    try {
      body = JSON.parse(event.body);
    } catch {
      return notOk400("Invalid JSON in request body");
    }

    const { instruction, position, slideType } = body;

    if (!instruction) {
      return notOk400("Instruction is required");
    }

    if (position === undefined || position < 0) {
      return notOk400("Position must be a non-negative integer");
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

    // Get full presentation for AI context
    const presentation = await PresentationRepository.getPresentation(presentationId);

    if (!presentation) {
      return notOk404("Presentation not found");
    }

    // Validate position is within bounds (can be at the end, so <= length)
    if (position > presentation.slides.length) {
      return notOk400(`Position out of range (max: ${presentation.slides.length})`);
    }

    // Generate new slide using AI
    const newSlide = await generateSlide(
      presentation,
      slideType || "content", // Default to content slide if not specified
      instruction,
    );

    // Insert slide at specified position
    presentation.slides.splice(position, 0, newSlide);

    // Re-save all slides with updated indices
    await PresentationRepository.saveSlides(presentationId, presentation.slides);

    const response: AddSlideResponse = {
      success: true,
      slide: newSlide,
      slideIndex: position,
    };

    return ok(response);
  } catch (error) {
    console.error("Error adding slide:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to add slide"));
  }
};

