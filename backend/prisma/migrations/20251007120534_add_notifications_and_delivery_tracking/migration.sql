-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EVENT_CREATED', 'USER_JOINED_EVENT', 'ORDER_PLACED', 'ORDER_UPDATED', 'EVENT_CLOSING_SOON', 'EVENT_CLOSED', 'PAYMENT_CONFIRMED', 'EVENT_COMPLETED', 'EVENT_DELIVERED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "estimatedDelivery" TEXT;

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "orderId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sentEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentInApp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnEventCreated" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnOrderPlaced" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnDeadlineApproaching" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnEventClosed" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnPaymentConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnEventCompleted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationEvent_userId_read_idx" ON "NotificationEvent"("userId", "read");

-- CreateIndex
CREATE INDEX "NotificationEvent_createdAt_idx" ON "NotificationEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
