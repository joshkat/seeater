import { clerkPlugin } from "@clerk/fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { env } from "./config/env.js";
import { eventRoutes } from "./modules/events/event.routes.js";
import prismaPlugin from "./plugins/prisma.js";
import { healthRoutes } from "./routes/health.js";

/** Allow requests with no Origin (curl, same-origin) and any localhost port in
 * development; in production restrict to the configured CORS_ORIGIN allowlist.
 * Keeping dev permissive avoids breakage when Vite drifts to another port. */
function resolveCorsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow: boolean) => void,
): void {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (env.NODE_ENV !== "production") {
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    callback(null, isLocalhost || env.CORS_ORIGIN.includes(origin));
    return;
  }
  callback(null, env.CORS_ORIGIN.includes(origin));
}

export interface BuildAppOptions {
  /** Overrides RATE_LIMIT_MAX (requests per minute per client IP). */
  rateLimitMax?: number;
}

/**
 * Builds and configures the Fastify application. Kept separate from the
 * server bootstrap (server.ts) so tests can build an app without listening.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: { production: "info", development: "debug", test: "silent" }[env.NODE_ENV],
    },
    trustProxy: env.TRUST_PROXY,
  });

  await app.register(sensible);
  // Standard security headers. The API is called cross-origin by the web app,
  // so allow cross-origin reads of its responses (CORS still decides who).
  await app.register(helmet, { crossOriginResourcePolicy: { policy: "cross-origin" } });
  await app.register(cors, { origin: resolveCorsOrigin });
  // Per-IP request cap. Sync makes a handful of calls a minute per open tab,
  // so the default leaves lots of headroom while stopping floods.
  await app.register(rateLimit, {
    max: options.rateLimitMax ?? env.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
  });
  await app.register(prismaPlugin);

  // Verify Clerk session tokens (attaches auth to each request) when configured.
  // Without keys the API runs in keyless dev mode (see lib/auth.ts).
  if (env.CLERK_SECRET_KEY) {
    await app.register(clerkPlugin, {
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });
  }

  // Translate request-validation failures into 400s with field details, and
  // never leak internal error text (e.g. database errors) in production.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Validation failed",
        issues: error.issues,
      });
    }
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode >= 500 && env.NODE_ENV === "production") {
      request.log.error(error);
      return reply.status(statusCode).send({
        statusCode,
        error: "Internal Server Error",
        message: "Something went wrong",
      });
    }
    return reply.send(error);
  });

  // Feature routes are registered under /api.
  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(eventRoutes, { prefix: "/api" });

  return app;
}
