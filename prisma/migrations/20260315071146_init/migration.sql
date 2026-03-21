/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `registerd_users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "registerd_users_email_key" ON "registerd_users"("email");
