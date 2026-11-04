-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('editor', 'viewer');

-- Event ids become globally unique (one row per event, shareable). Before

-- this, the key was (ownerId, id), so two owners could hold the same id (e.g.

-- both imported one backup file). Keep the most recently updated row; the

-- other owner's client re-uploads its copy under a fresh id ("idTaken").
DELETE FROM "EventDocument" a
USING "EventDocument" b
WHERE a."id" = b."id"
  AND (a."updatedAt", a."ownerId") < (b."updatedAt", b."ownerId");


-- AlterTable
ALTER TABLE "EventDocument" DROP CONSTRAINT "EventDocument_pkey",
ADD COLUMN     "ownerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareToken" TEXT,
ADD CONSTRAINT "EventDocument_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "EventMember" (
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "role" "MemberRole" NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventMember_pkey" PRIMARY KEY ("eventId","email")
);

-- CreateTable
CREATE TABLE "EventLock" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventLock_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "EventImage" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventImage_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateIndex
CREATE INDEX "EventMember_userId_idx" ON "EventMember"("userId");

-- CreateIndex
CREATE INDEX "EventMember_email_idx" ON "EventMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EventDocument_shareToken_key" ON "EventDocument"("shareToken");

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLock" ADD CONSTRAINT "EventLock_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventImage" ADD CONSTRAINT "EventImage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
