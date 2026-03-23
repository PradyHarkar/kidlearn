/**
 * Next.js instrumentation hook — runs once at server startup (Node.js runtime only).
 * Loads secrets from AWS Secrets Manager before any routes are served.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadSecrets } = await import("./lib/secrets");
    await loadSecrets();
  }
}
