/// <reference types="sst" />
// Temporary declarations to satisfy type checker in this environment
// They will be provided by SST during dev/build
declare const $app: any;
declare const $config: any;
declare const sst: any;

export default $config({
  app(input: { stage?: string }) {
    return {
      name: "sst-backend-template-test", // TODO Is it really correct to include "-test" in the name here ?
      home: "aws",
      providers: {
        aws: { region: process.env.AWS_REGION || "eu-north-1" },
      },
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    // TODO Is it really needed to load .env.[stage] manually here?
    // TODO SST will load them automatically based on $app.stage

    // Load environment variables from .env files
    const fs = require("node:fs");
    const path = require("node:path");

    // Load stage-specific .env file
    const envFile = `.env.${$app.stage}`;
    const envPath = path.join(process.cwd(), envFile);

    console.log(`Loading env file: ${envFile} from ${envPath}`);
    console.log(`Stage: ${$app.stage}`);

    interface EnvVars {
      [x: string]: any;
    }

    const envVars: EnvVars = {};

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      console.log("Env file content:", envContent);
      envContent.split("\n").forEach((line: string) => {
        // Ignore empty lines entirely
        if (!line || !line.trim()) return;
        // Ignore full-line comments starting with '#'
        if (line.trim().startsWith("#")) return;

        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          // Join back the value portion in case it contained '='
          let valueRaw = valueParts.join("=");
          // Strip inline comments (everything after an unescaped '#')
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

    console.log("Loaded env vars:", envVars);

    // DynamoDB Table with simple design
    const table = new sst.aws.Dynamo("ItemsTable", {
      fields: {
        pk: "string", // Partition key
        sk: "string", // Sort key
        gsi1pk: "string", // GSI1 partition key for category
        gsi1sk: "string", // GSI1 sort key
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      globalIndexes: {
        GSI1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
      },
    });

    // Create API Gateway V2 with custom authorizer support
    const api = new sst.aws.ApiGatewayV2("Api", {
      // Optional: Add custom domain
      // domain: "api.example.com",

      // Optional: Configure CORS
      cors: {
        allowCredentials: false, // Set to false when using wildcard origins
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowOrigins: ["*"], // Configure this properly for production
        maxAge: "1 day",
      },

      // Optional: Configure access logging
      accessLog: {
        retention: "1 month",
      },
    });

    // Add external custom authorizer by ARN
    // Uncomment and configure if you have an existing authorizer function
    /*
    const externalAuthorizer = api.addAuthorizer("ExternalAuthorizer", {
      lambda: {
        functionArn: envVars.AUTHORIZER_ARN, // ARN of your existing authorizer function
        identitySources: ["$request.header.Authorization"],
        ttl: "3600 seconds" // Cache authorization for 1 hour
      }
    });
    */

    // Add JWT authorizer example (alternative to Lambda authorizer)
    /*
    const jwtAuthorizer = api.addAuthorizer("JWTAuthorizer", {
      jwt: {
        issuer: envVars.JWT_ISSUER || "https://your-auth-provider.com",
        audiences: [envVars.JWT_AUDIENCE || "your-api-audience"],
        identitySource: "$request.header.Authorization"
      }
    });
    */

    // Add routes to the API Gateway
    // Health check endpoint (public, no auth required)
    api.route("GET /health", "src/handlers/http/health.handler", {
      // No auth required for health check
    });

    // Item endpoints (protected with custom authorizer)
    api.route("POST /items", {
      handler: "src/handlers/http/createItem.handler",
      link: [table], // Link to DynamoDB table
      environment: {
        TABLE_NAME: table.name,
      },
      timeout: "5 seconds",
      // Uncomment to enable authentication with external authorizer
      /*
      auth: {
        lambda: externalAuthorizer.id // Use external authorizer by ARN
        // OR use JWT authorizer:
        // jwt: {
        //   authorizer: jwtAuthorizer.id,
        //   scopes: ["write:items"] // Optional: require specific scopes
        // }
      }
      */
    });

    api.route("GET /items", {
      handler: "src/handlers/http/getItems.handler",
      link: [table],
      environment: {
        TABLE_NAME: table.name,
      },
      timeout: "5 seconds",
      // Uncomment to enable authentication with external authorizer
      /*
      auth: {
        lambda: externalAuthorizer.id
        // OR use JWT authorizer:
        // jwt: {
        //   authorizer: jwtAuthorizer.id,
        //   scopes: ["read:items"]
        // }
      }
      */
    });

    api.route("GET /items/{id}", {
      handler: "src/handlers/http/getItem.handler",
      link: [table],
      environment: {
        TABLE_NAME: table.name,
      },
      timeout: "5 seconds",
      // Uncomment to enable authentication with external authorizer
      /*
      auth: {
        lambda: externalAuthorizer.id
        // OR use JWT authorizer:
        // jwt: {
        //   authorizer: jwtAuthorizer.id,
        //   scopes: ["read:items"]
        // }
      }
      */
    });

    // Example: Add more routes with different auth configurations
    /*
    // Public endpoint (no auth)
    api.route("GET /public", "src/handlers/http/public.handler");
    
    // Protected endpoint with IAM auth
    api.route("GET /admin", "src/handlers/http/admin.handler", {
      auth: {
        iam: true // Requires AWS IAM credentials
      }
    });
    
    // Protected endpoint with JWT auth and scopes
    api.route("GET /profile", "src/handlers/http/profile.handler", {
      auth: {
        jwt: {
          authorizer: jwtAuthorizer.id,
          scopes: ["read:profile"]
        }
      }
    });
    */

    // Outputs
    return {
      ApiUrl: api.url,
      TableName: table.name,
      Stage: $app.stage,
      // Uncomment if using authorizers
      // ExternalAuthorizerId: externalAuthorizer?.id,
      // JWTAuthorizerId: jwtAuthorizer?.id,
    };
  },
});
