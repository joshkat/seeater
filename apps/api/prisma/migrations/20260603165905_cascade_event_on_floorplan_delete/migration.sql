-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_floorPlanId_fkey";

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
