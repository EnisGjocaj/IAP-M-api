/*
  Warnings:

  - Changed the type of `role` on the `TeamMember` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('EXECUTIVE_DIRECTOR', 'MEETING_COORDINATOR', 'BOARD_MEMBER', 'PRESIDENT');

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "cvPath" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "twitterUrl" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "TeamMemberRole" NOT NULL;

-- CreateTable
CREATE TABLE "JobListing" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "salary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);
