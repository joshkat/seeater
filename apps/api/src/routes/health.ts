import type { FastifyInstance } from "fastify";

/**
 * Health-check route. Verifies the process is up and the database is
 * reachable, so deploy/uptime checks can hit a single endpoint.
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/health", async () => {
    await fastify.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", timestamp: new Date().toISOString() };
  });
}
