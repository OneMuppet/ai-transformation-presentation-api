import { OAuth2Client } from "google-auth-library";
import type { AuthUser } from "@/types/presentation";
import { getSecret } from "./secrets";

// Cached OAuth client
let cachedOAuthClient: OAuth2Client | null = null;

// Initialize Google OAuth client
const getOAuthClient = async (): Promise<OAuth2Client> => {
  if (cachedOAuthClient) {
    return cachedOAuthClient;
  }

  const clientId = await getSecret("GOOGLE_CLIENT_ID");
  const clientSecret = await getSecret("GOOGLE_CLIENT_SECRET");

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required (set in AWS Secrets Manager or env var)");
  }

  cachedOAuthClient = new OAuth2Client(clientId, clientSecret);
  return cachedOAuthClient;
};

// Whitelist can be comma-separated emails
const getWhitelist = (): string[] => {
  const whitelist = process.env.USER_WHITELIST;
  if (!whitelist) {
    return [];
  }
  return whitelist.split(",").map((email) => email.trim().toLowerCase());
};

/**
 * Verify Google OAuth token and extract user info
 * Supports both access tokens (from useGoogleLogin) and ID tokens
 */
export async function verifyGoogleToken(token: string): Promise<AuthUser | null> {
  // First, try to verify as an access token by calling Google's userinfo endpoint
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const userInfo = await response.json();
      if (userInfo.email) {
        return {
          email: userInfo.email,
          name: userInfo.name,
        };
      }
    }
  } catch (error) {
    console.log("Token is not a valid access token, trying ID token verification");
  }

  // Fall back to ID token verification
  try {
    const client = await getOAuthClient();
    const clientId = await getSecret("GOOGLE_CLIENT_ID");

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return null;
    }

    return {
      email: payload.email,
      name: payload.name,
    };
  } catch (error) {
    console.error("Error verifying Google token:", error);
    return null;
  }
}

/**
 * Check if user is in whitelist
 */
export function isUserWhitelisted(email: string): boolean {
  const whitelist = getWhitelist();

  if (whitelist.length === 0) {
    // No whitelist configured - allow all authenticated users
    return true;
  }

  return whitelist.includes(email.toLowerCase());
}

/**
 * Extract and verify user from Authorization header
 * @param authHeader - The Authorization header value (e.g., "Bearer <token>")
 * @returns The authenticated user or null if authentication fails
 * @throws Error if user is not authorized (not in whitelist)
 */
export async function getUserFromAuthHeader(authHeader?: string): Promise<AuthUser | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const user = await verifyGoogleToken(token);

  if (!user) {
    return null;
  }

  if (!isUserWhitelisted(user.email)) {
    throw new Error("User not authorized");
  }

  return user;
}

/**
 * Extract user from API Gateway event
 * Looks for user info in the event context (set by authorizer) or Authorization header
 */
export async function getUserFromEvent(event: {
  headers?: Record<string, string | undefined>;
  requestContext?: {
    authorizer?: {
      claims?: {
        email?: string;
        name?: string;
      };
      lambda?: {
        email?: string;
        name?: string;
      };
    };
  };
}): Promise<AuthUser | null> {
  // First, check if user info was set by a Lambda authorizer
  const lambdaAuth = event.requestContext?.authorizer?.lambda;
  if (lambdaAuth?.email) {
    return {
      email: lambdaAuth.email,
      name: lambdaAuth.name,
    };
  }

  // Check if user info was set by a JWT authorizer
  const jwtClaims = event.requestContext?.authorizer?.claims;
  if (jwtClaims?.email) {
    return {
      email: jwtClaims.email,
      name: jwtClaims.name,
    };
  }

  // Fall back to checking Authorization header directly
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  return getUserFromAuthHeader(authHeader);
}

/**
 * Require authentication - throws if user is not authenticated
 */
export async function requireAuth(event: {
  headers?: Record<string, string | undefined>;
  requestContext?: {
    authorizer?: {
      claims?: { email?: string; name?: string };
      lambda?: { email?: string; name?: string };
    };
  };
}): Promise<AuthUser> {
  const user = await getUserFromEvent(event);

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

