/*
  Warnings:

  - You are about to drop the column `date` on the `events` table. All the data in the column will be lost.
  - The `status` column on the `user_requirements` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `endDate` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('TEXT', 'FILE', 'BOTH', 'QUESTIONNAIRE');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserSpecialtyStatus" AS ENUM ('IN_PROGRESS', 'WAITING_APPROVAL', 'COMPLETED');

-- AlterTable
ALTER TABLE "events" DROP COLUMN "date",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "requirements" ADD COLUMN     "area" TEXT,
ADD COLUMN     "type" "RequirementType" NOT NULL DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE "user_requirements" ADD COLUMN     "answerFileUrl" TEXT,
ADD COLUMN     "answerText" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "RequirementStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "completedAt" DROP NOT NULL,
ALTER COLUMN "completedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_specialties" ADD COLUMN     "status" "UserSpecialtyStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastClassMilestone" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "requirementId" TEXT NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
