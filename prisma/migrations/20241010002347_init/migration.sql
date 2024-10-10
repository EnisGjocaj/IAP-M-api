/*
  Warnings:

  - A unique constraint covering the columns `[email,type]` on the table `Application` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Application_email_key";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Application_email_type_key" ON "Application"("email", "type");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
