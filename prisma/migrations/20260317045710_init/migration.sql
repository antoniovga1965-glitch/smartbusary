-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "nameinput" TEXT NOT NULL,
    "bithcertno" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "countyresidence" TEXT NOT NULL,
    "subcounty" TEXT NOT NULL,
    "wardlevel" TEXT NOT NULL,
    "schoolname" TEXT NOT NULL,
    "primarySchoolemail" TEXT NOT NULL,
    "secondarySchoolemail" TEXT NOT NULL,
    "schoolcounty" TEXT NOT NULL,
    "kcpecode" TEXT NOT NULL,
    "kcpeindexno" TEXT NOT NULL,
    "kcpeyear" INTEGER NOT NULL,
    "kcpemarks" INTEGER NOT NULL,
    "currentform" TEXT NOT NULL,
    "admissionno" TEXT NOT NULL,
    "schooltype" TEXT NOT NULL,
    "guardianname" TEXT NOT NULL,
    "guardianphoneno" TEXT NOT NULL,
    "guardianID" TEXT NOT NULL,
    "Guardian_krapin" TEXT NOT NULL,
    "relationshiptostudent" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "guardianlocation" TEXT NOT NULL,
    "guardiansincome" TEXT NOT NULL,
    "numberofsiblings" INTEGER NOT NULL,
    "siblingsinschool" INTEGER NOT NULL,
    "orphanstatus" TEXT NOT NULL,
    "housingstatus" TEXT NOT NULL,
    "schoolverified" BOOLEAN NOT NULL DEFAULT false,
    "kraverified" BOOLEAN NOT NULL DEFAULT false,
    "fraudscore" INTEGER NOT NULL DEFAULT 0,
    "flags" JSONB NOT NULL DEFAULT '[]',
    "createdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationFiles" (
    "id" TEXT NOT NULL,
    "applicationid" TEXT NOT NULL,
    "birthcertificate" TEXT NOT NULL,
    "admissionletter" TEXT NOT NULL,
    "feestructure" TEXT NOT NULL,
    "schoolreport" TEXT NOT NULL,
    "disabilitystatus" TEXT NOT NULL,
    "guardiannationalid" TEXT NOT NULL,
    "proofofincome" TEXT NOT NULL,
    "disabilitycertificates" TEXT NOT NULL,
    "chiefsletter" TEXT NOT NULL,
    "passportphoto" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationFiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationFiles_applicationid_key" ON "ApplicationFiles"("applicationid");

-- AddForeignKey
ALTER TABLE "ApplicationFiles" ADD CONSTRAINT "ApplicationFiles_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
