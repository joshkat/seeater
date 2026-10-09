-- CreateTable
CREATE TABLE "EventDocument" (
    "ownerId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventDocument_pkey" PRIMARY KEY ("ownerId","id")
);

-- CreateIndex
CREATE INDEX "EventDocument_ownerId_updatedAt_idx" ON "EventDocument"("ownerId", "updatedAt");
