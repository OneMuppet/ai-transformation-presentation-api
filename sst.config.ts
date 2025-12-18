/// <reference types="sst" />
// Temporary declarations to satisfy type checker in this environment
// They will be provided by SST during dev/build
declare const $app: { stage: string };
declare const $config: (config: { app: (input: { stage?: string }) => object; run: () => Promise<object> }) => void;
declare const sst: {
  aws: {
    Dynamo: new (name: string, config: object) => { name: string };
    ApiGatewayV2: new (name: string, config: object) => {
      url: string;
      route: (path: string, handler: string | object, options?: object) => void;
    };
    Queue: new (name: string, config?: object) => { arn: string; url: string };
    Function: new (name: string, config: object) => object;
  };
};

export default $config({
  app(input: { stage?: string }) {
    return {
      name: "ai-presentation-api",
      home: "aws",
      providers: {
        aws: { region: process.env.AWS_REGION || "eu-north-1" },
      },
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    // Load environment variables from .env files
    const fs = require("node:fs");
    const path = require("node:path");

    // Load stage-specific .env file
    const envFile = `.env.${$app.stage}`;
    const envPath = path.join(process.cwd(), envFile);

    console.log(`Loading env file: ${envFile} from ${envPath}`);
    console.log(`Stage: ${$app.stage}`);

    interface EnvVars {
      [x: string]: string;
    }

    const envVars: EnvVars = {};

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      console.log("Env file found");
      envContent.split("\n").forEach((line: string) => {
        if (!line || !line.trim()) return;
        if (line.trim().startsWith("#")) return;

        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          let valueRaw = valueParts.join("=");
          const hashIndex = valueRaw.indexOf("#");
          if (hashIndex !== -1) {
            valueRaw = valueRaw.substring(0, hashIndex);
          }
          const value = valueRaw.trim();
          if (key.trim()) {
            envVars[key.trim()] = value;
          }
        }
      });
    } else {
      console.warn(`⚠️  Environment file ${envFile} not found. Using defaults.`);
    }

    // Validate required environment variables
    if (!envVars.AWS_ACCOUNT) {
      console.error(`❌ AWS_ACCOUNT not found in .env.${$app.stage}`);
      console.error("Please add AWS_ACCOUNT=your-account-id to your environment file.");
      process.exit(1);
    }

    // ============================================
    // DynamoDB Table for Presentations
    // ============================================
    const presentationsTable = new sst.aws.Dynamo("PresentationsTable", {
      fields: {
        pk: "string", // PRESENTATION#{id}
        sk: "string", // METADATA or SLIDE#000
        gsi1pk: "string", // USER#{userId}
        gsi1sk: "string", // PRESENTATION#{id}
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      globalIndexes: {
        GSI1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
      },
    });

    // ============================================
    // SQS Queue for Async Presentation Generation
    // ============================================
    const generationQueue = new sst.aws.Queue("PresentationGenerationQueue", {
      visibilityTimeout: "3 minutes", // Must be >= Lambda timeout
      retentionPeriod: "7 days",
    });

    // ============================================
    // Lambda Function for SQS Processing
    // ============================================
    // Subscribe handler to the queue with all required config
    generationQueue.subscribe(
      {
        handler: "src/handlers/sqs/generatePresentation.handler",
        timeout: "120 seconds",
        memory: "512 MB",
        link: [presentationsTable],
        environment: {
          TABLE_NAME: presentationsTable.name,
          SECRETS_ID: envVars.SECRETS_ID || "",
          OPENAI_MODEL: envVars.OPENAI_MODEL || "gpt-4o-mini",
          WEBSOCKET_API_ENDPOINT: envVars.WEBSOCKET_API_ENDPOINT || "",
        },
        permissions: [
          {
            actions: ["secretsmanager:GetSecretValue"],
            resources: [`arn:aws:secretsmanager:${process.env.AWS_REGION || "eu-north-1"}:${envVars.AWS_ACCOUNT}:secret:qodea-presentation-agent-*`],
          },
          {
            actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan", "dynamodb:BatchWriteItem"],
            resources: ["*"],
          },
        ],
      },
    );

    // ============================================
    // API Gateway V2
    // ============================================
    // CORS configuration: allowCredentials can only be true with specific origins
    const corsOrigins = envVars.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter((o) => o) || ["*"];
    const allowCredentials = corsOrigins.length > 0 && corsOrigins[0] !== "*";

    const api = new sst.aws.ApiGatewayV2("Api", {
      cors: {
        allowCredentials: allowCredentials,
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowOrigins: corsOrigins,
        maxAge: "1 day",
      },
      accessLog: {
        retention: "1 month",
      },
    });

    // Common environment variables for handlers
    // Secrets (OPENAI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are loaded from AWS Secrets Manager
    const handlerEnv = {
      TABLE_NAME: presentationsTable.name,
      SQS_QUEUE_URL: generationQueue.url,
      SECRETS_ID: envVars.SECRETS_ID || "",
      USER_WHITELIST: envVars.USER_WHITELIST || "",
      OPENAI_MODEL: envVars.OPENAI_MODEL || "gpt-4o-mini",
    };

    // Common permissions for handlers that need secrets
    const secretsPermissions = [
      {
        actions: ["secretsmanager:GetSecretValue"],
        resources: [`arn:aws:secretsmanager:${process.env.AWS_REGION || "eu-north-1"}:${envVars.AWS_ACCOUNT}:secret:qodea-presentation-agent-*`],
      },
    ];

    // ============================================
    // Health Check (Public)
    // ============================================
    api.route("GET /health", "src/handlers/http/health.handler");

    // ============================================
    // Presentation Routes
    // ============================================

    // Create presentation (requires auth)
    api.route("POST /presentations", {
      handler: "src/handlers/http/createPresentation.handler",
      link: [presentationsTable, generationQueue],
      environment: handlerEnv,
      timeout: "10 seconds",
      permissions: secretsPermissions,
    });

    // Get user's presentations (requires auth)
    api.route("GET /presentations", {
      handler: "src/handlers/http/getUserPresentations.handler",
      link: [presentationsTable],
      environment: handlerEnv,
      timeout: "10 seconds",
      permissions: secretsPermissions,
    });

    // Get single presentation (public for viewing)
    api.route("GET /presentations/{id}", {
      handler: "src/handlers/http/getPresentation.handler",
      link: [presentationsTable],
      environment: handlerEnv,
      timeout: "10 seconds",
    });

    // Update presentation metadata (requires auth)
    api.route("PUT /presentations/{id}", {
      handler: "src/handlers/http/updatePresentation.handler",
      link: [presentationsTable],
      environment: handlerEnv,
      timeout: "10 seconds",
      permissions: secretsPermissions,
    });

    // Delete presentation (requires auth)
    api.route("DELETE /presentations/{id}", {
      handler: "src/handlers/http/deletePresentation.handler",
      link: [presentationsTable],
      environment: handlerEnv,
      timeout: "10 seconds",
      permissions: secretsPermissions,
    });

    // Update slide with AI (requires auth)
    api.route("PUT /presentations/{id}/slides/{index}", {
      handler: "src/handlers/http/updateSlide.handler",
      link: [presentationsTable],
      environment: handlerEnv,
      timeout: "60 seconds", // AI updates can take time
      permissions: secretsPermissions,
    });

    // Add slide with AI (requires auth)
    api.route("POST /presentations/{id}/slides", {
      handler: "src/handlers/http/addSlide.handler",
      link: [presentationsTable],
      environment: handlerEnv,
      timeout: "60 seconds", // AI generation can take time
      permissions: secretsPermissions,
    });

    // Delete slide (requires auth)
    api.route("DELETE /presentations/{id}/slides/{index}", {
      handler: "src/handlers/http/deleteSlide.handler",
      link: [presentationsTable],
      environment: handlerEnv,
      timeout: "10 seconds",
      permissions: secretsPermissions,
    });

    // Refine entire presentation with AI (requires auth)
    api.route("POST /presentations/{id}/refine", {
      handler: "src/handlers/http/refinePresentation.handler",
      link: [presentationsTable],
      environment: handlerEnv,
      timeout: "90 seconds", // Bulk refinement can take time
      permissions: secretsPermissions,
    });

    // ============================================
    // Legacy Item Routes (can be removed later)
    // ============================================
    // Keeping for backward compatibility during migration
    /*
    api.route("POST /items", {
      handler: "src/handlers/http/createItem.handler",
      link: [presentationsTable],
      environment: { TABLE_NAME: presentationsTable.name },
      timeout: "5 seconds",
    });

    api.route("GET /items", {
      handler: "src/handlers/http/getItems.handler",
      link: [presentationsTable],
      environment: { TABLE_NAME: presentationsTable.name },
      timeout: "5 seconds",
    });

    api.route("GET /items/{id}", {
      handler: "src/handlers/http/getItem.handler",
      link: [presentationsTable],
      environment: { TABLE_NAME: presentationsTable.name },
      timeout: "5 seconds",
    });
    */

    // ============================================
    // Outputs
    // ============================================
    return {
      ApiUrl: api.url,
      TableName: presentationsTable.name,
      QueueUrl: generationQueue.url,
      Stage: $app.stage,
    };
  },
});
