import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7+). The CLI no longer reads `.env` or a
 * datasource URL from schema.prisma on its own, so both are wired here.
 * Run Prisma commands from apps/api (the npm scripts do this).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
