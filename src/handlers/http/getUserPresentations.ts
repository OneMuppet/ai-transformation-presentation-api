import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { requireAuth } from "@/libs/auth";
import { PresentationRepository } from "@/libs/presentationRepo";
import { notOk401, notOk500, ok } from "@/libs/response";
import { isGoogleAuthConfigured } from "@/libs/secrets";

/**
 * GET /presentations
 * Get all presentations for the authenticated user
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

    // Get all presentations for the user
    const presentations = await PresentationRepository.getUserPresentations(userEmail);

    return ok({
      presentations,
      count: presentations.length,
    });
  } catch (error) {
    console.error("Error getting user presentations:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to get presentations"));
  }
};

