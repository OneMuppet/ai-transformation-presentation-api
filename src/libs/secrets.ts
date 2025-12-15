import {
  CreateSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

// Create AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({});

// In-memory cache for secrets
type CachedSecret = {
  value: string;
  fetchedAt: number;
};

const cache: Record<string, CachedSecret> = {};

// Cache TTL in milliseconds (15 minutes)
const CACHE_TTL = 15 * 60 * 1000;

/**
 * Retrieve a secret from AWS Secrets Manager with in-memory caching
 * @param secretId - The ID or ARN of the secret
 * @returns The secret value as a string
 */
export const getSecret = async (secretId: string): Promise<string> => {
  // Check cache first
  const cached = cache[secretId];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretId,
    });

    const response = await secretsClient.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretId} has no string value`);
    }

    // Cache the result
    cache[secretId] = {
      value: response.SecretString,
      fetchedAt: Date.now(),
    };

    return response.SecretString;
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretId}:`, error);
    throw error;
  }
};

/**
 * Retrieve a JSON secret from AWS Secrets Manager and parse it with caching
 * @param secretId - The ID or ARN of the secret
 * @returns The parsed JSON object
 */
export const getSecretAsJson = async <T = any>(secretId: string): Promise<T> => {
  try {
    const secretString = await getSecret(secretId);
    return JSON.parse(secretString) as T;
  } catch (error) {
    console.error(`Failed to parse secret ${secretId} as JSON:`, error);
    throw error;
  }
};

/**
 * Set a JSON secret in AWS Secrets Manager
 * @param secretId - The ID or ARN of the secret
 * @param data - The data to store as JSON
 */
export const setSecretAsJson = async <T = unknown>(secretId: string, data: T): Promise<void> => {
  const jsonString = JSON.stringify(data, null, 2);

  try {
    // Try to update existing secret
    await secretsClient.send(
      new PutSecretValueCommand({
        SecretId: secretId,
        SecretString: jsonString,
      }),
    );
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      // Secret doesn't exist, create it
      await secretsClient.send(
        new CreateSecretCommand({
          Name: secretId,
          SecretString: jsonString,
          Description: `Application configuration for ${secretId}`,
        }),
      );
    } else {
      throw error;
    }
  }

  // Clear cache for this secret
  delete cache[secretId];
};

/**
 * Clear the in-memory cache for a specific secret or all secrets
 * @param secretId - Optional secret ID to clear, if not provided clears all
 */
export const clearSecretCache = (secretId?: string): void => {
  if (secretId) {
    delete cache[secretId];
  } else {
    Object.keys(cache).forEach((key) => {
      delete cache[key];
    });
  }
};

/**
 * Example usage for database credentials with caching
 * Uncomment and modify as needed for your application
 */
/*
export const getDatabaseCredentials = async () => {
  const secretId = process.env.SECRETS_ID || "TODO_SECRETS_ID";
  return await getSecretAsJson<{
    username: string;
    password: string;
    host: string;
    port: number;
    database: string;
  }>(secretId);
};
*/

/**
 * Example usage for API keys with caching
 * Uncomment and modify as needed for your application
 */
/*
export const getApiKeys = async () => {
  const secretId = process.env.API_KEYS_SECRET_ID || "TODO_API_KEYS_SECRET_ID";
  return await getSecretAsJson<{
    externalApiKey: string;
    webhookSecret: string;
  }>(secretId);
};
*/

/**
 * Example usage for updating configuration secrets
 * Uncomment and modify as needed for your application
 */
/*
export const updateApiConfiguration = async (config: {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}) => {
  const secretId = process.env.API_CONFIG_SECRET_ID || "TODO_API_CONFIG_SECRET_ID";
  await setSecretAsJson(secretId, config);
  // Cache is automatically cleared for this secret
};
*/
