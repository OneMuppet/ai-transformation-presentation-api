import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { requireAuth } from "@/libs/auth";
import { PresentationRepository } from "@/libs/presentationRepo";
import { notOk400, notOk401, notOk500, ok } from "@/libs/response";
import { isGoogleAuthConfigured } from "@/libs/secrets";
import type {
  CreatePresentationRequest,
  CreatePresentationResponse,
  PresentationTheme,
} from "@/types/presentation";

// Initialize SQS client
const sqsClient = new SQSClient({});

const getQueueUrl = (): string => {
  return process.env.SQS_QUEUE_URL || "";
};

/**
 * POST /presentations
 * Create a new presentation and queue it for AI generation
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Authentication - optional if GOOGLE_CLIENT_ID not configured (dev mode)
    let userEmail = "anonymous@dev.local";
    
    const authEnabled = await isGoogleAuthConfigured();
    if (authEnabled) {
      // Auth enabled - require authentication
      try {
        const user = await requireAuth(event);
        userEmail = user.email;
      } catch (error) {
        return notOk401("Unauthorized");
      }
    } else {
      // Auth disabled for development
      console.log("Auth disabled - GOOGLE_CLIENT_ID not configured");
    }

    // Parse and validate request body
    if (!event.body) {
      return notOk400("Request body is required");
    }

    let body: CreatePresentationRequest;
    try {
      body = JSON.parse(event.body);
    } catch {
      return notOk400("Invalid JSON in request body");
    }

    const { title, description } = body;

    if (!title || !description) {
      return notOk400("Title and description are required");
    }

    // Generate unique presentation ID
    const presentationId = `presentation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Default theme
    const theme: PresentationTheme = {
      logo: "image",
      logoImage: "/logo.svg",
      colors: "qodea",
      videoBackground: "/videos/qodea-video.mp4",
    };

    // Save initial metadata with processing status
    await PresentationRepository.savePresentationMetadata({
      id: presentationId,
      title,
      description,
      userId: userEmail,
      status: "processing",
      theme,
    });

    // Send message to SQS for async generation
    const queueUrl = getQueueUrl();
    if (queueUrl) {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify({
            presentationId,
            userId: userEmail,
            title,
            description,
            // connectionId will be set by WebSocket connection if available
          }),
        }),
      );
    } else {
      console.warn("SQS_QUEUE_URL not configured - presentation will not be generated");
    }

    const response: CreatePresentationResponse = {
      presentationId,
      status: "processing",
      message: "Presentation generation started",
    };

    return ok(response);
  } catch (error) {
    console.error("Error creating presentation:", error);
    return notOk500(error instanceof Error ? error : new Error("Failed to create presentation"));
  }
};

