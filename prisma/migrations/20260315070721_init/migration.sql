-- CreateTable
CREATE TABLE "registerd_users" (
    "id" SERIAL NOT NULL,
    "registername" TEXT NOT NULL,
    "registeradmission" TEXT NOT NULL,
    "registerschool" TEXT NOT NULL,
    "registercounty" TEXT NOT NULL,
    "registerpassword" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'student',
    "Created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registerd_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registerd_users_registeradmission_key" ON "registerd_users"("registeradmission");
