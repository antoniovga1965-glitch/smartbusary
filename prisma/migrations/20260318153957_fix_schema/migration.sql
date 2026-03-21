/*
  Warnings:

  - You are about to drop the column `disabilitystatus` on the `ApplicationFiles` table. All the data in the column will be lost.
  - Added the required column `disabilitystatus` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "disabilitystatus" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ApplicationFiles" DROP COLUMN "disabilitystatus";
