import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export interface AppSecrets {
  OPENAI_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

// Cache secrets to avoid repeated API calls
let cachedSecrets: AppSecrets | null = null;

const secretsClient = new SecretsManagerClient({});

/**
 * Load secrets from AWS Secrets Manager
 * Uses SECRETS_ID env var to determine which secret to load
 */
export async function loadSecrets(): Promise<AppSecrets> {
  // Return cached secrets if available
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const secretId = process.env.SECRETS_ID;

  if (!secretId) {
    console.warn("SECRETS_ID not configured - secrets will not be loaded from AWS");
    return {};
  }

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: secretId,
      })
    );

    if (response.SecretString) {
      cachedSecrets = JSON.parse(response.SecretString) as AppSecrets;
      console.log("✅ Loaded secrets from AWS Secrets Manager");
      return cachedSecrets;
    }

    console.warn("Secret found but no SecretString present");
    return {};
  } catch (error) {
    console.error("Failed to load secrets from AWS Secrets Manager:", error);
    return {};
  }
}

/**
 * Get a specific secret value
 * Falls back to environment variable if secrets not loaded
 */
export async function getSecret(key: keyof AppSecrets): Promise<string | undefined> {
  const secrets = await loadSecrets();
  
  // Check secrets first, then fall back to env var
  return secrets[key] || process.env[key];
}

/**
 * Check if Google OAuth is configured
 */
export async function isGoogleAuthConfigured(): Promise<boolean> {
  const clientId = await getSecret("GOOGLE_CLIENT_ID");
  return !!clientId;
}

/**
 * Clear cached secrets (useful for testing)
 */
export function clearSecretsCache(): void {
  cachedSecrets = null;
}
