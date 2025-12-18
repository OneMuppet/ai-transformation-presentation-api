import type { SQSEvent, SQSRecord } from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { generatePresentation } from "@/libs/openai";
import { PresentationRepository } from "@/libs/presentationRepo";
import type { GeneratePresentationMessage, WebSocketMessage } from "@/types/presentation";

// WebSocket API endpoint for notifications
const getWebSocketEndpoint = (): string => {
  return process.env.WEBSOCKET_API_ENDPOINT || "";
};

/**
 * SQS Lambda handler for async presentation generation
 * Triggered when a new presentation creation request is queued
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      await processMessage(record);
    } catch (error) {
      console.error("Error processing message:", error);
      // Throwing will cause the message to be retried or sent to DLQ
      throw error;
    }
  }
};

/**
 * Process a single SQS message
 */
async function processMessage(record: SQSRecord): Promise<void> {
  const message: GeneratePresentationMessage = JSON.parse(record.body);
  const { presentationId, userId, title, description, connectionId } = message;

  console.log(`Processing presentation generation for: ${presentationId}`);

  try {
    // Generate presentation using OpenAI
    const presentation = await generatePresentation(title, description);

    // Override the generated ID with our presentationId
    presentation.id = presentationId;

    // Save slides to DynamoDB
    await PresentationRepository.saveSlides(presentationId, presentation.slides);

    // Update status to completed
    await PresentationRepository.updatePresentationStatus(presentationId, "completed");

    // Notify via WebSocket if connectionId provided
    if (connectionId) {
      await notifyWebSocket(connectionId, {
        type: "presentation-completed",
        presentationId,
      });
    }

    console.log(`✓ Successfully generated presentation: ${presentationId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`✗ Failed to generate presentation ${presentationId}:`, error);

    // Update status to failed
    await PresentationRepository.updatePresentationStatus(presentationId, "failed", errorMessage);

    // Notify via WebSocket
    if (connectionId) {
      await notifyWebSocket(connectionId, {
        type: "presentation-failed",
        presentationId,
        error: errorMessage,
      });
    }

    throw error;
  }
}

/**
 * Send notification via WebSocket
 */
async function notifyWebSocket(connectionId: string, message: WebSocketMessage): Promise<void> {
  const endpoint = getWebSocketEndpoint();

  if (!endpoint) {
    console.warn("WEBSOCKET_API_ENDPOINT not configured - skipping notification");
    return;
  }

  try {
    const apiClient = new ApiGatewayManagementApiClient({
      endpoint,
    });

    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(message)),
      }),
    );
  } catch (error) {
    console.error("Error sending WebSocket message:", error);
    // Don't throw - WebSocket failures shouldn't fail the Lambda
  }
}

