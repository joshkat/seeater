import { buildApp } from "./app.js";
import { env } from "./config/env.js";

/**
 * Server bootstrap: builds the app, starts listening, and wires graceful
 * shutdown on SIGINT/SIGTERM.
 */
async function start(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "Shutting down");
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
