import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { requireAuth } from "@/libs/auth";
import { updateSlides } from "@/libs/openai";
import { PresentationRepository } from "@/libs/presentationRepo";
import { notOk400, notOk401, notOk403, notOk404, notOk500, ok } from "@/libs/response";
import { isGoogleAuthConfigured } from "@/libs/secrets";
import type { UpdateSlideRequest, UpdateSlideResponse } from "@/types/presentation";

/**
 * PUT /presentations/{id}/slides/{index}
 * Update a slide using AI based on user instruction
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

    // Parse request body
    if (!event.body) {
      return notOk400("Request body is required");
    }

    let body: UpdateSlideRequest;
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

    // Check if slide index is valid
    if (slideIndex >= presentation.slides.length) {
      return notOk400(`Slide index out of range (max: ${presentation.slides.length - 1})`);
    }

    // Call OpenAI to update slides
    const affectedSlides = await updateSlides(presentation, slideIndex, instruction);

    // Update affected slides in DynamoDB
    for (const { slideIndex: idx, slide } of affectedSlides) {
      if (idx >= 0 && idx < presentation.slides.length) {
        presentation.slides[idx] = slide;
      }
    }

    // Save all slides (simpler than updating individually)
    await PresentationRepository.saveSlides(presentationId, presentation.slides);

    const response: UpdateSlideResponse = {
      success: true,
      affectedSlides,
    };

    return ok(response);
  } catch (error) {
    console.error("Error updating slide:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to update slide"));
  }
};

