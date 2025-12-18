#!/usr/bin/env npx tsx

/**
 * Deploy secrets from .secrets.json to AWS Secrets Manager
 * Usage: AWS_PROFILE=profile-name npx tsx scripts/deploy-secrets.ts [stage]
 */

import {
  CreateSecretCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SecretsConfig {
  [stage: string]: {
    [key: string]: string;
  };
}

const SECRETS_FILE = path.join(__dirname, ".secrets.json");
const SECRET_NAME_PREFIX = "qodea-presentation-agent";

async function deploySecrets(stage: string) {
  // Read secrets file
  if (!fs.existsSync(SECRETS_FILE)) {
    console.error(`❌ Secrets file not found: ${SECRETS_FILE}`);
    console.error(`   Please create it based on ${path.join(__dirname, ".secrets.example.json")}`);
    process.exit(1);
  }

  const secretsContent = fs.readFileSync(SECRETS_FILE, "utf-8");
  const secretsConfig: SecretsConfig = JSON.parse(secretsContent);

  if (!secretsConfig[stage]) {
    console.error(`❌ Stage "${stage}" not found in secrets file`);
    console.error(`   Available stages: ${Object.keys(secretsConfig).join(", ")}`);
    process.exit(1);
  }

  const stageSecrets = secretsConfig[stage];
  const secretId = `${SECRET_NAME_PREFIX}-${stage}`;

  console.log(`📦 Deploying secrets for stage: ${stage}`);
  console.log(`   Secret ID: ${secretId}`);
  console.log(`   Keys: ${Object.keys(stageSecrets).join(", ")}`);

  // Create AWS client
  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || "eu-north-1",
  });

  // Prepare secret value as JSON
  const secretValue = JSON.stringify(stageSecrets, null, 2);

  try {
    // Try to update existing secret
    await client.send(
      new PutSecretValueCommand({
        SecretId: secretId,
        SecretString: secretValue,
      }),
    );
    console.log(`✅ Updated secret: ${secretId}`);
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      // Secret doesn't exist, create it
      await client.send(
        new CreateSecretCommand({
          Name: secretId,
          SecretString: secretValue,
          Description: `Presentation Agent secrets for ${stage} stage`,
        }),
      );
      console.log(`✅ Created secret: ${secretId}`);
    } else {
      console.error(`❌ Failed to deploy secret: ${error.message}`);
      process.exit(1);
    }
  }

  console.log(`\n🎉 Secrets deployed successfully!`);
  console.log(`   Use SECRETS_ID=${secretId} in your .env.${stage} file`);
}

// Main
const stage = process.argv[2] || "test";

if (!process.env.AWS_PROFILE && !process.env.AWS_ACCESS_KEY_ID) {
  console.error("❌ AWS_PROFILE or AWS credentials must be set");
  process.exit(1);
}

deploySecrets(stage).catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

