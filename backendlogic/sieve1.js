const express = require("express");
const router = express.Router();
const z = require("zod");
const limitor = require("express-rate-limit");
const fs = require("fs");
const verifyjwt = require("../middlewarerej");
const pdfsieve = require("./pdfuplaods");
const prisma = require("../prisma.client");
const path = require("path");
const { verificationQueue } = require("../bullmq/queue");
const crypto = require("crypto");
const { checkBehavioralPatterns } = require("../bullmq/bottracking");
const logger = require("../security/winston");
const getresend = require('../helpers/email');

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("uploads_tmp")) fs.mkdirSync("uploads_tmp");

const chunkRegistry = new Map();

setInterval(() => {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [key] of chunkRegistry) {
    const timestamp = parseInt(key.split("-")[1]);
    if (timestamp && timestamp < twoHoursAgo) {
      chunkRegistry.delete(key);
    }
  }
}, 30 * 60 * 1000);

router.post("/upload-chunk", (req, res) => {
  const chunks = [];

  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const { fileid, chunknumber, totalchunks, filename } = req.headers;

    if (!fileid || !chunknumber || !totalchunks || !filename) {
      return res.status(400).json({ message: "Missing chunk headers" });
    }

    if (!body || body.length === 0) {
      return res.status(400).json({ message: "No chunk data received" });
    }

    try {
      const tempDir = path.join("uploads_tmp", fileid);
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const chunkPath = path.join(tempDir, `chunk_${chunknumber}`);
      fs.writeFileSync(chunkPath, body);

      const receivedChunks = fs.readdirSync(tempDir).filter(f => f.startsWith("chunk_")).length;

      if (receivedChunks == parseInt(totalchunks)) {
        const finalPath = path.join("uploads", `${Date.now()}-${filename}`);
        const writeStream = fs.createWriteStream(finalPath);

        const chunkFiles = fs.readdirSync(tempDir)
          .filter(f => f.startsWith("chunk_"))
          .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]));

        for (const chunkFile of chunkFiles) {
          const chunkData = fs.readFileSync(path.join(tempDir, chunkFile));
          writeStream.write(chunkData);
        }

        writeStream.end(() => {
          console.log(`File ${filename} assembled at ${finalPath}`);
          chunkRegistry.set(fileid, finalPath);
        });

        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      res.json({ message: `Chunk ${chunknumber} uploaded` });

    } catch (err) {
      console.error("Error handling chunk upload:", err);
      res.status(500).json({ message: "Server error uploading chunk" });
    }
  });

  req.on('error', (err) => {
    console.error("Stream error:", err);
    res.status(500).json({ message: "Stream error" });
  });
});

const limit = limitor({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many attempts try again after 15 minutes" },
});

// ========== ZOD SCHEMA ==========
const secondaryapplicantshemas = z.object({
  nameinput: z.string().min(2, "Full name must be at least 2 characters long").trim(),
  bithcertno: z.string().min(11, "Birth Certificate Number is required"),
  gender: z.enum(["Male", "Female", "Rather not say"], { errorMap: () => ({ message: "Please select your gender" }) }),
  countyresidence: z.string().min(1, "County of residence is required"),
  subcounty: z.string().min(1, "Sub-county is required"),
  wardlevel: z.string().min(1, "Ward is required"),
  schoolname: z.string().min(1, "School name is required"),
  primarySchoolemail: z.string().email("Invalid primary school email"),
  secondarySchoolemail: z.string().email("Invalid secondary school email"),
  schoolcounty: z.string().min(1, "School county is required"),
  kcpecode: z.string().min(9, "KCPE Code is required"),
  Assesmentno: z.string().min(10, "KCPE Index Number is required"),
  personalemail: z.string().email('email required'),
  kcpeyear: z.coerce.number().min(2000).max(new Date().getFullYear()),
  kcpemarks: z.coerce.number().min(0).max(500, "Marks must be between 0 and 500"),
  currentform: z.enum(["Form 1", "Form 2", "Form 3", "Form 4"], { errorMap: () => ({ message: "Please select current form" }) }),
  admissionno: z.string().regex(/\b\d{1,5}\b/, "Admission number is required"),
  schooltype: z.enum(['National', "Public", "Private", "Extra County", "County", "Sub-county"], { errorMap: () => ({ message: "Select school category" }) }),
  Guardian_krapin: z.string().regex(/^[A-Z]\d{9}[A-Z]$/, "Invalid KRA PIN format"),
  guardianname: z.string().min(2, "Guardian name is required"),
  guardianphoneno: z.string().regex(/^(?:254|\+254|0)?(7|1)\d{8}$/, "Invalid Kenyan phone number"),
  guardianID: z.string().min(6, "ID Number is too short").max(10),
  relationshiptostudent: z.enum(["Father", "Mother", "Guardian", "Relative"], { errorMap: () => ({ message: "Select relationship category" }) }),
  occupation: z.string().min(1, "Occupation is required"),
  guardianlocation: z.string().min(1, "Guardian location is required"),
  guardiansincome: z.enum(["Below 5,000 KES", "5,000 – 15,000 KES", "15,000 – 30,000 KES", "Above 30,000 KES"], { errorMap: () => ({ message: "Select guardian's income" }) }),
  numberofsiblings: z.coerce.number().int().min(0),
  siblingsinschool: z.coerce.number().int().min(0),
  orphanstatus: z.enum(["Not orphan", "Partial orphan", "Orphan"]),
  housingstatus: z.enum(["Owned", "Rented", "Living with relative", "Informal settlement"]),
  disabilitystatus: z.enum(["disabled", "not disabled"], { errorMap: () => ({ message: "Please select a valid disability status" }) }),
   timeToSubmit: z.coerce.number().optional(),}).passthrough();

const validateFiles = (req, res, next) => {
  const requiredFiles = [
    "birthcertificate", "admissionletter", "feestructure",
    "schoolreport", "guardiannationalid", "proofofincome",
    "chiefsletter", "passportphoto",
  ];
  const fileIds = req.body.fileIds;
  console.log("FILEIDS RECEIVED:", JSON.stringify(fileIds)); // 👈
  if (!fileIds) {
    console.log("NO FILEIDS"); // 👈
    return res.status(422).json({ message: "No files uploaded" });
  }
  for (const field of requiredFiles) {
    const fileId = fileIds[field];
    if (!fileId) {
      console.log(`MISSING FILEID: ${field}`); // 👈
      return res.status(422).json({ message: `${field} is required` });
    }
    const filePath = chunkRegistry.get(fileId);
    console.log(`${field} → fileId: ${fileId} → path: ${filePath}`); // 👈
    if (!filePath || !fs.existsSync(filePath)) {
      console.log(`FILE MISSING ON DISK: ${field}`); // 👈
      return res.status(422).json({ message: `${field} upload incomplete — please try again` });
    }
  }
  next();
};

// ========== DEVICE FINGERPRINT ==========
const generateDeviceFingerprint = (req) => {
  const components = [
    req.headers["user-agent"] || "",
    req.headers["accept-language"] || "",
    req.headers["accept-encoding"] || "",
    req.headers["accept"] || "",
  ];
  return crypto.createHash("sha256").update(components.join("|")).digest("hex");
};

// ========== MAIN ROUTE ==========
router.post("/secondaryapplicants", limit, verifyjwt, verifyschemas, validateFiles, async (req, res) => {
  const {
    nameinput, bithcertno, gender, countyresidence, subcounty, wardlevel,
    schoolname, primarySchoolemail, secondarySchoolemail, schoolcounty,
    kcpecode, Assesmentno, kcpeyear, kcpemarks, currentform, admissionno,
    schooltype, guardianname, guardianphoneno, guardianID, relationshiptostudent,
    occupation, guardianlocation, disabilitystatus, guardiansincome,
    numberofsiblings, siblingsinschool, orphanstatus, housingstatus,
    Guardian_krapin, personalemail, fileIds,
  } = req.body;

  // ✅ resolve all file paths from chunkRegistry
  const resolveFile = (field) => chunkRegistry.get(fileIds[field]) || null;

  const resolvedFiles = {
    birthcertificate: resolveFile("birthcertificate"),
    admissionletter: resolveFile("admissionletter"),
    feestructure: resolveFile("feestructure"),
    schoolreport: resolveFile("schoolreport"),
    guardiannationalid: resolveFile("guardiannationalid"),
    proofofincome: resolveFile("proofofincome"),
    chiefsletter: resolveFile("chiefsletter"),
    passportphoto: resolveFile("passportphoto"),
    DeathCertificates: fileIds.DeathCertificates ? resolveFile("DeathCertificates") : null,
    disabilitycertificates: fileIds.disabilitycertificates ? resolveFile("disabilitycertificates") : null,
  };

  try {
    
    const fakeReqFiles = {};
    for (const [field, filePath] of Object.entries(resolvedFiles)) {
      if (filePath) fakeReqFiles[field] = [{ path: filePath }];
    }

    const pdfdoc = await pdfsieve(fakeReqFiles);
    if (pdfdoc.length > 0) {
      return res.status(422).json({ message: "Something is wrong with pdf authenticity try with correct ones" });
    }

    
    const hashfile = (filepath) => {
      const buffer = fs.readFileSync(filepath);
      return crypto.createHash("sha256").update(buffer).digest("hex");
    };

    const hashes = Object.values(resolvedFiles)
      .filter(Boolean)
      .map(hashfile);

    const duplicates = await prisma.Application.findFirst({
      where: { filehashes: { hasSome: hashes } },
    });

    if (duplicates) {
      return res.status(409).json({ message: "Duplicate documents detected — these files have been used in another application" });
    }

    const devicefingerprint = generateDeviceFingerprint(req);
    const devicecount = await prisma.Application.count({ where: { devicefingerprint } });

    if (devicecount > 50) {
      return res.status(409).json({ message: "Too many applications from this device" });
    }

    const Ipaddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const useragent = req.headers["user-agent"] || "unknown";

    const timetosubmit = parseInt(req.body.timeToSubmit) || null;
    const behaviouralflags = await checkBehavioralPatterns(Ipaddress, devicefingerprint, useragent, timetosubmit);
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev && behaviouralflags.length > 0) {
      return res.status(429).json({ message: "Suspicious activity detected — please try again later" });
    }

    const saveapplicant = await prisma.Application.create({
      data: {
        Ipaddress, devicefingerprint, useragent, nameinput, filehashes: hashes,
        bithcertno, gender, countyresidence, subcounty, wardlevel, disabilitystatus,
        schoolname, primarySchoolemail, secondarySchoolemail, schoolcounty, kcpecode,
        Assesmentno, kcpeyear: parseInt(kcpeyear), kcpemarks: parseInt(kcpemarks),
        currentform, admissionno, schooltype, guardianname, guardianphoneno, guardianID,
        relationshiptostudent, occupation, guardianlocation, guardiansincome,
        numberofsiblings: parseInt(numberofsiblings), siblingsinschool: parseInt(siblingsinschool),
        orphanstatus, housingstatus, Guardian_krapin, personalemail,
        files: {
          create: {
            birthcertificate: resolvedFiles.birthcertificate,
            admissionletter: resolvedFiles.admissionletter,
            feestructure: resolvedFiles.feestructure,
            schoolreport: resolvedFiles.schoolreport,
            guardiannationalid: resolvedFiles.guardiannationalid,
            proofofincome: resolvedFiles.proofofincome,
            chiefsletter: resolvedFiles.chiefsletter,
            passportphoto: resolvedFiles.passportphoto,
            disabilitycertificates: resolvedFiles.disabilitycertificates,
            DeathCertificates: resolvedFiles.DeathCertificates,
          },
        },
      },
    });

    await verificationQueue.add("verify", {
      type: "credentials reuse",
      applicationid: saveapplicant.id,
      guardianID, nameinput, gender, bithcertno, guardianname, schoolname,
      Assesmentno, schoolcounty, Guardian_krapin, countyresidence, Ipaddress,
      disabilitystatus, guardianlocation, guardiansincome, admissionno,
      currentform, kcpeyear, personalemail,
      files: resolvedFiles,
    });

    const randomNumber = Math.random();
    if (randomNumber < 0.1) {
      await prisma.Application.update({
        where: { id: saveapplicant.id },
        data: { status: "random_audit" },
      });
      logger.warn(`Application ${saveapplicant.id} selected for random audit`);
    }

    logger.info(`${nameinput} submitted application successfully`);

    try {
      const send = getresend();
      await send.emails.send({
        from: 'onboarding@resend.dev',
        to: personalemail,
        subject: "Application Received — Smart Bursary Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #166534; border-bottom: 2px solid #166534; padding-bottom: 10px;">Application Received</h2>
            <p>Hello <strong>${nameinput}</strong>,</p>
            <p>Your bursary application has been successfully received and is currently being verified by our fraud detection system.</p>
            <div style="background: #f0fdf4; border-left: 4px solid #166534; padding: 15px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Application ID:</strong> ${saveapplicant.id}</p>
              <p style="margin: 5px 0;"><strong>School:</strong> ${schoolname}</p>
              <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleDateString('en-KE')}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Processing...</p>
            </div>
            <p>You will receive another email once verification is complete. Please do not resubmit your application.</p>
            <p style="color: #666; font-size: 13px;">If you did not submit this application please contact us immediately at <a href="mailto:hello@smartbursary.co.ke">hello@smartbursary.co.ke</a></p>
            <br/>
            <p style="color: #166534; font-weight: bold;">Smart Bursary Portal</p>
            <p style="font-size: 12px; color: #666;">Kenya's County Fraud Detection System</p>
          </div>
        `
      });
      console.log(`Confirmation email sent to ${personalemail}`);
    } catch (error) {
      console.log(error);
    }

    for (const fileId of Object.values(fileIds)) {
      if (fileId) chunkRegistry.delete(fileId);
    }

    return res.status(200).json({
      message: `Dear ${nameinput} your Application has been received, wait for processing`,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong check and try again" });
  }
});

module.exports = router;
