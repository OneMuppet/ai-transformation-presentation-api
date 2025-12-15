import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { notOk500, ok } from "@/libs/response";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("🔍 DEBUG: Health handler called");
  console.log("🔍 DEBUG: Event:", JSON.stringify(event, null, 2));

  try {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "sst-backend-template-test", // Replace with your app name
      version: "1.0.0",
      environment: process.env.SST_STAGE || "unknown",
    };

    console.log("🔍 DEBUG: Returning health data:", healthData);
    return ok(healthData);
  } catch (error) {
    console.error("Health check failed:", error);
    return notOk500({
      error: "Health check failed",
      timestamp: new Date().toISOString(),
    });
  }
};
