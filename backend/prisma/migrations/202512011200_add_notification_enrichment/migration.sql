-- AlterTable
ALTER TABLE "NotificationEvent" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "body" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "ctaId" TEXT,
ADD COLUMN     "ctaKind" TEXT,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "NotificationEvent_actorId_idx" ON "NotificationEvent"("actorId");

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

