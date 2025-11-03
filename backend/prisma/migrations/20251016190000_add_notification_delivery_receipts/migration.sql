-- CreateEnum
CREATE TYPE "NotificationDeliveryChannel" AS ENUM ('REALTIME', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('SUCCESS', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "NotificationDeliveryReceipt" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationDeliveryChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'SUCCESS',
    "latencyMs" INTEGER NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDeliveryReceipt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NotificationDeliveryReceipt" ADD CONSTRAINT "NotificationDeliveryReceipt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "NotificationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDeliveryReceipt" ADD CONSTRAINT "NotificationDeliveryReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDeliveryReceipt" ADD CONSTRAINT "NotificationDeliveryReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "NotificationDeliveryReceipt_companyId_deliveredAt_idx" ON "NotificationDeliveryReceipt"("companyId", "deliveredAt");
CREATE INDEX "NotificationDeliveryReceipt_notificationId_idx" ON "NotificationDeliveryReceipt"("notificationId");
CREATE INDEX "NotificationDeliveryReceipt_userId_channel_idx" ON "NotificationDeliveryReceipt"("userId", "channel");
