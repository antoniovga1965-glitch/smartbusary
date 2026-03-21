/*
  Warnings:

  - Added the required column `ipaddress` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "ipaddress" TEXT NOT NULL,
ADD COLUMN     "useragent" TEXT;
