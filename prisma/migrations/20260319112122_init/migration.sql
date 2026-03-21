/*
  Warnings:

  - Added the required column `DeathCertificates` to the `ApplicationFiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ApplicationFiles" ADD COLUMN     "DeathCertificates" TEXT NOT NULL;
