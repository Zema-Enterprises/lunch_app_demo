-- CreateTable
CREATE TABLE "CompanyTheme" (
    "companyId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "coverPhotoUrl" TEXT,
    "coverPhotoWidth" INTEGER,
    "coverPhotoHeight" INTEGER,
    "coverPhotoFormat" TEXT,
    "coverPhotoSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyTheme_pkey" PRIMARY KEY ("companyId")
);

-- AddForeignKey
ALTER TABLE "CompanyTheme" ADD CONSTRAINT "CompanyTheme_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

