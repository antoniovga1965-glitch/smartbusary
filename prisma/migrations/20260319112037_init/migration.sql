/*
  Warnings:

  - You are about to drop the column `kcpeindexno` on the `Application` table. All the data in the column will be lost.
  - Added the required column `Assesmentno` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Application" DROP COLUMN "kcpeindexno",
ADD COLUMN     "Assesmentno" TEXT NOT NULL;
