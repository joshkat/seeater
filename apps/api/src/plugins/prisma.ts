import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/**
 * Exposes a single PrismaClient instance on the Fastify instance as
 * `fastify.prisma`, and disconnects it cleanly on shutdown.
 */
declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function prismaPlugin(fastify: FastifyInstance): Promise<void> {
  const prisma = new PrismaClient();
  await prisma.$connect();

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
}

export default fp(prismaPlugin, { name: "prisma" });
