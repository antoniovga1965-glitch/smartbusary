-- AlterTable
ALTER TABLE "registerd_users" ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "token" TEXT;
