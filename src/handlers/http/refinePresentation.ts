import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { requireAuth } from "@/libs/auth";
import { refinePresentation } from "@/libs/openai";
import { PresentationRepository } from "@/libs/presentationRepo";
import { notOk400, notOk401, notOk403, notOk404, notOk500, ok } from "@/libs/response";
import { isGoogleAuthConfigured } from "@/libs/secrets";
import type { RefinePresentationRequest, RefinePresentationResponse } from "@/types/presentation";

/**
 * POST /presentations/{id}/refine
 * Refine entire presentation using AI based on user instruction
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

    let body: RefinePresentationRequest;
    try {
      body = JSON.parse(event.body);
    } catch {
      return notOk400("Invalid JSON in request body");
    }

    const { instruction } = body;

    if (!instruction) {
      return notOk400("Instruction is required");
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

    // Call OpenAI to refine presentation
    const affectedSlides = await refinePresentation(presentation, instruction);

    // Update affected slides in the presentation
    for (const { slideIndex, slide } of affectedSlides) {
      if (slideIndex >= 0 && slideIndex < presentation.slides.length) {
        presentation.slides[slideIndex] = slide;
      }
    }

    // Save all slides
    await PresentationRepository.saveSlides(presentationId, presentation.slides);

    const response: RefinePresentationResponse = {
      success: true,
      affectedSlides,
    };

    return ok(response);
  } catch (error) {
    console.error("Error refining presentation:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to refine presentation"));
  }
};

