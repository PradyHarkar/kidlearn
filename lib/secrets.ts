import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

let loaded = false;

/**
 * Fetches secrets from AWS Secrets Manager and injects them into process.env.
 * Falls back silently in local dev when USE_SECRETS_MANAGER is not set.
 * Called once from instrumentation.ts on server startup.
 */
export async function loadSecrets(): Promise<void> {
  if (loaded) return;
  loaded = true;

  if (!process.env.USE_SECRETS_MANAGER) return;

  try {
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || "ap-southeast-2",
      ...(process.env.AWS_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      }),
    });

    const response = await client.send(
      new GetSecretValueCommand({ SecretId: "kidlearn/secrets" })
    );

    const secrets = JSON.parse(response.SecretString!) as Record<string, string>;

    // Inject into process.env only if not already set (env takes precedence for overrides)
    for (const [key, value] of Object.entries(secrets)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    console.log("[Secrets] Loaded from AWS Secrets Manager");
  } catch (err) {
    console.error("[Secrets] Failed to load from AWS Secrets Manager:", err);
  }
}
