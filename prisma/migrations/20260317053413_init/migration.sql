/*
  Warnings:

  - You are about to drop the column `ipaddress` on the `Application` table. All the data in the column will be lost.
  - Added the required column `Ipaddress` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Application" DROP COLUMN "ipaddress",
ADD COLUMN     "Ipaddress" TEXT NOT NULL;
