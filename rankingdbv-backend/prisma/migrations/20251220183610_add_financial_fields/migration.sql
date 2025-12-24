/*
  Warnings:

  - Added the required column `updatedAt` to the `user_requirements` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'WAITING_APPROVAL', 'COMPLETED', 'CANCELED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COUNSELOR';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "activityId" TEXT;

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "activityId" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'DINHEIRO',
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "proofUrl" TEXT,
ADD COLUMN     "recurrence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED';

-- AlterTable
ALTER TABLE "user_requirements" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "courseName" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "disabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "diseasesHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "educationLevel" TEXT,
ADD COLUMN     "educationStatus" TEXT,
ADD COLUMN     "emergencyName" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "emergencyRelation" TEXT,
ADD COLUMN     "fatherEmail" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "fatherPhone" TEXT,
ADD COLUMN     "hasDiabetes" BOOLEAN DEFAULT false,
ADD COLUMN     "hasHeartProblem" BOOLEAN DEFAULT false,
ADD COLUMN     "hasPsychProblem" BOOLEAN DEFAULT false,
ADD COLUMN     "hasRenalProblem" BOOLEAN DEFAULT false,
ADD COLUMN     "healthNotes" TEXT,
ADD COLUMN     "healthPlan" TEXT,
ADD COLUMN     "healthProfessionalType" TEXT,
ADD COLUMN     "heartProblemDesc" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "isBaptized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHealthProfessional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "issuingOrg" TEXT,
ADD COLUMN     "knowledgeArea" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "motherEmail" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "motherPhone" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "recentFracture" TEXT,
ADD COLUMN     "recentSurgery" TEXT,
ADD COLUMN     "recentTrauma" TEXT,
ADD COLUMN     "regularMedications" TEXT,
ADD COLUMN     "rg" TEXT,
ADD COLUMN     "rhFactor" TEXT,
ADD COLUMN     "sex" TEXT,
ADD COLUMN     "shirtSize" TEXT,
ADD COLUMN     "specificAllergies" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "susNumber" TEXT;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
