import "dotenv/config";
import { z } from "zod";

/**
 * Validates and normalizes environment configuration at startup so the rest
 * of the app can depend on a typed, guaranteed-present config object.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  // Requests per minute allowed from one client IP (all routes but /health).
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  // Set when running behind a reverse proxy / load balancer (Fly, Render, …)
  // so rate limiting sees the real client IP from X-Forwarded-For: "true" to
  // trust any proxy, or a comma-separated list of proxy IPs/CIDRs.
  TRUST_PROXY: z
    .string()
    .default("false")
    .transform((value): boolean | string =>
      value === "true" ? true : value === "false" ? false : value,
    ),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173")
    .transform((value) => value.split(",").map((origin) => origin.trim())),
  // Clerk auth keys. Optional: when absent, the API runs in dev mode without
  // auth (owner resolved from x-owner-id / a fixed dev user).
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. See errors above.");
}

export const env = parsed.data;
