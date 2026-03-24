const multer = require("multer");
const express = require("express");
const router = express.Router();
const z = require("zod");
const limitor = require("express-rate-limit");
const fs = require("fs");
const verifyjwt = require("../middlewarerej");
// const templatevalidation = require('./templatevalidation');
// const metadata = require("./metadata");
const pdfsieve = require("./pdfuplaods");
const prisma = require("../prisma.client");
const path = require("path");
const { Queue } = require("bullmq");
const { verificationQueue } = require("../bullmq/queue");
const crypto = require("crypto");
const { checkBehavioralPatterns } = require("../bullmq/bottracking");
const logger = require("../security/winston");
const getresend = require('../helpers/email');



if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("uploads_tmp")) fs.mkdirSync("uploads_tmp");

router.post("/upload-chunk", express.raw({ type: "*/*", limit: "2mb" }), (req, res) => {
  try {
    const { fileid, chunknumber, totalchunks, filename } = req.headers;
    if (!fileid || !chunknumber || !totalchunks || !filename) {
      return res.status(400).json({ message: "Missing chunk headers" });
    }

    const tempDir = path.join("uploads_tmp", fileid);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const chunkPath = path.join(tempDir, `chunk_${chunknumber}`);
    fs.writeFileSync(chunkPath, req.body);
    console.log(`Received chunk ${chunknumber}/${totalchunks} for ${filename}`);

    // Check if all chunks are received
    const receivedChunks = fs.readdirSync(tempDir).filter(f => f.startsWith("chunk_")).length;
    if (receivedChunks == totalchunks) {
      const finalPath = path.join("uploads", `${Date.now()}-${filename}`);
      const writeStream = fs.createWriteStream(finalPath);

      // Sort chunks to ensure correct order
      const chunks = fs.readdirSync(tempDir)
        .filter(f => f.startsWith("chunk_"))
        .sort((a, b) => {
          const numA = parseInt(a.split("_")[1]);
          const numB = parseInt(b.split("_")[1]);
          return numA - numB;
        });

      for (const chunkFile of chunks) {
        const chunkData = fs.readFileSync(path.join(tempDir, chunkFile));
        writeStream.write(chunkData);
      }

      writeStream.end(() => console.log(`File ${filename} assembled successfully`));

      // Cleanup temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    res.json({ message: `Chunk ${chunknumber} uploaded` });
  } catch (err) {
    console.error("Error handling chunk upload:", err);
    res.status(500).json({ message: "Server error uploading chunk" });
  }
});



// if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const limit = limitor({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many attempts try gain after 15minutes" },
});

const secondaryapplicantshemas = z.object({
  nameinput: z
    .string()
    .min(2, "Full name must be at least 2 characters long")
    .trim(),
  bithcertno: z.string().min(11, "Birth Certificate Number is required"),
  gender: z.enum(["Male", "Female", "Rather not say"], {
    errorMap: () => ({ message: "Please select your gender" }),
  }),
  countyresidence: z.string().min(1, "County of residence is required"),
  subcounty: z.string().min(1, "Sub-county is required"),
  wardlevel: z.string().min(1, "Ward is required"),

  schoolname: z.string().min(1, "School name is required"),
  primarySchoolemail: z.string().email("Invalid primary school email"),
  secondarySchoolemail: z.string().email("Invalid secondary school email"),
  schoolcounty: z.string().min(1, "School county is required"),
  kcpecode: z.string().min(9, "KCPE Code is required"),
  Assesmentno: z.string().min(10, "KCPE Index Number is required"),
  personalemail:z.string().email('email required'),
  kcpeyear: z.coerce.number().min(2000).max(new Date().getFullYear()),
  kcpemarks: z.coerce
    .number()
    .min(0)
    .max(500, "Marks must be between 0 and 500"),
  currentform: z.enum(["Form 1", "Form 2", "Form 3", "Form 4"], {
    errorMap: () => ({ message: "Please select current form" }),
  }),
  admissionno: z.string().regex(/\b\d{1,5}\b/, "Admission number is required"),
  schooltype: z.enum(
    ['National',"Public", "Private", "Extra County", "County", "Sub-county"],
    {
      errorMap: () => ({ message: "Select school category" }),
    },
  ),
  Guardian_krapin: z
    .string()
    .regex(/^[A-Z]\d{9}[A-Z]$/, "Invalid KRA PIN format"),

  guardianname: z.string().min(2, "Guardian name is required"),
  guardianphoneno: z
    .string()
    .regex(/^(?:254|\+254|0)?(7|1)\d{8}$/, "Invalid Kenyan phone number"),
  guardianID: z.string().min(6, "ID Number is too short").max(10),
  relationshiptostudent: z.enum(["Father", "Mother", "Guardian", "Relative"], {
    errorMap: () => ({ message: "Select relationship category" }),
  }),
  occupation: z.string().min(1, "Occupation is required"),
  guardianlocation: z.string().min(1, "Guardian location is required"),
  guardiansincome: z.enum(
    [
      "Below 5,000 KES",
      "5,000 – 15,000 KES",
      "15,000 – 30,000 KES",
      "Above 30,000 KES",
    ],
    {
      errorMap: () => ({ message: "Select guardian's income" }),
    },
  ),
  numberofsiblings: z.coerce.number().int().min(0),
  siblingsinschool: z.coerce.number().int().min(0),
  orphanstatus: z.enum(["Not orphan", "Partial orphan", "Orphan"]),
  housingstatus: z.enum([
    "Owned",
    "Rented",
    "Living with relative",
    "Informal settlement",
  ]),
  disabilitystatus: z.enum(["disabled", "not disabled"], {
    errorMap: () => ({ message: "Please select a valid disability status" }),
  }),
  timeToSubmit: z.coerce.number().optional(),
});

const validateFiles = (req, res, next) => {
  const requiredFiles = [
    "birthcertificate",
    "admissionletter",
    "feestructure",
    // "DeathCertificates",
    "schoolreport",
    "guardiannationalid",
    "proofofincome",
    // "disabilitycertificates",
    "chiefsletter",
    "passportphoto",
  ];

  for (const field of requiredFiles) {
    const file = req.files?.[field]?.[0];
    if (!file) return res.status(422).json({ message: `${field} is required` });
    if (file.size > 15 * 1024 * 1024)
      return res.status(422).json({ message: `${field} must be under 2MB` });
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype))
      return res
        .status(422)
        .json({ message: `${field} must be JPG, PNG, or PDF` });
  }
  next();
};
const verifyschemas = (req, res, next) => {
  const verifiedscheme = secondaryapplicantshemas.safeParse(req.body);
  if (!verifiedscheme.success) {
    return res.status(422).json({
      message: "Check your fields and try again",
      errors:
        verifiedscheme.error?.errors?.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })) || [],
    });
  }
  next();
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 15* 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/png") ||
      file.mimetype.startsWith("image/jpeg") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("only accepts images pings and pdfs"));
    }
  },
});

const documents = [
  { name: "birthcertificate", max: 1 },
  { name: "admissionletter", max: 1 },
  { name: "feestructure", max: 1 },
  { name: "DeathCertificates", max: 1 },
  { name: "schoolreport", max: 1 },
  { name: "guardiannationalid", max: 1 },
  { name: "proofofincome", max: 1 },
  { name: "disabilitycertificates", max: 1 },
  { name: "chiefsletter", max: 1 },
  { name: "passportphoto", max: 1 },
];

const generateDeviceFingerprint = (req) => {
  const components = [
    req.headers["user-agent"] || "",
    req.headers["accept-language"] || "",
    req.headers["accept-encoding"] || "",
    req.headers["accept"] || "",
  ];

  const raw = components.join("|");
  return crypto.createHash("sha256").update(raw).digest("hex");
};
router.post(
  "/secondaryapplicants", limit,verifyjwt, verifyschemas,validateFiles,
  upload.fields(documents), 
  async (req, res) => {
    const {
      nameinput,
      bithcertno,
      gender,
      countyresidence,
      subcounty,
      wardlevel,
      schoolname,
      primarySchoolemail,
      secondarySchoolemail,
      schoolcounty,
      kcpecode,
      Assesmentno,
      kcpeyear,
      kcpemarks,
      currentform,
      admissionno,
      schooltype,
      guardianname,
      guardianphoneno,
      guardianID,
      relationshiptostudent,
      occupation,
      guardianlocation,
      disabilitystatus,
      guardiansincome,
      numberofsiblings,
      siblingsinschool,
      orphanstatus,
      housingstatus,
      Guardian_krapin,
      personalemail,
      
    } = req.body;

    try {
      // template validation sieve 1

      // const flags = await templatevalidation(req.files);
      // if (flags.length > 0) {
      //   return res.status(422).json({
      //     message: "Some documents failed due to wrong template format ",
      //   });
      // }

      // checking metadata from uplaoded files

      // const metadataflags = await metadata(req.files);
      // console.error(metadataflags);
      
      // if (metadataflags.length > 0) {
      //   return res.status(422).json({
      //     message:
      //       "Your image uplaod looks so suspicious  try uplaoding original documents",
      //   });
      // }

      // checking pdf

      const pdfdoc = await pdfsieve(req.files);

      if (pdfdoc.length > 0) {
        return res.status(422).json({
          message:
            "Something is wrong with pdf authenticity try with correct ones",
        });
      }

      const hashfile = async (filepath) => {
        const buffer = fs.readFileSync(filepath);
        return crypto.createHash("sha256").update(buffer).digest("hex");
      };

      const hashes = await Promise.all(
        Object.values(req.files).map((fileArr) => hashfile(fileArr[0].path)),
      );

      const duplicates = await prisma.Application.findFirst({
        where: { filehashes: { hasSome: hashes } },
      });

      if (duplicates) {
        return res.status(409).json({
          message:
            "Duplicate documents detected — these files have been used in another application",
        });
      }


      // save to database

      const devicefingerprint = generateDeviceFingerprint(req);

      const devicecount = await prisma.Application.count({
        where: { devicefingerprint },
      });

      if (devicecount > 50) {
        return res.status(409).json({
          message: "Too many applications from this device",
        });
      }

      const Ipaddress =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      const useragent = req.headers["user-agent"] || "unkown";


      // bottracking
      const timetosubmit = parseInt(req.body.timeToSubmit) || null;

      const behaviouralflags = await checkBehavioralPatterns(
        Ipaddress,
        devicefingerprint,
        useragent,
        timetosubmit,
      );

      const isDev = process.env.NODE_ENV === "development";

      if (!isDev&&behaviouralflags.length > 0) {
        return res.status(429).json({
          message: "Suspicious activity detected — please try again later",
        });
      }


      const parsedkcpeyear = parseInt(kcpeyear);
      const parsedkcpemarks = parseInt(kcpemarks);
      const parsednumberofsiblings = parseInt(numberofsiblings);
      const parsedsiblingsinschool = parseInt(siblingsinschool);

      const saveapplicant = await prisma.Application.create({
        data: {
          Ipaddress,
          devicefingerprint,
          useragent,
          nameinput,
          filehashes: hashes,
          bithcertno,
          gender,
          countyresidence,
          subcounty,
          wardlevel,
          disabilitystatus,
          schoolname,
          primarySchoolemail,
          secondarySchoolemail,
          schoolcounty,
          kcpecode,
          Assesmentno,
          kcpeyear: parsedkcpeyear,
          kcpemarks: parsedkcpemarks,
          currentform,
          admissionno,
          schooltype,
          guardianname,
          guardianphoneno,
          guardianID,
          relationshiptostudent,
          occupation,
          guardianlocation,
          guardiansincome,
          numberofsiblings: parsednumberofsiblings,
          siblingsinschool: parsedsiblingsinschool,
          orphanstatus,
          housingstatus,
          Guardian_krapin,
          personalemail,

          files: {
            create: {
              birthcertificate: req.files.birthcertificate[0].path,
              admissionletter: req.files.admissionletter[0].path,
              feestructure: req.files.feestructure[0].path,
              schoolreport: req.files.schoolreport[0].path,
              guardiannationalid: req.files.guardiannationalid[0].path,
              proofofincome: req.files.proofofincome[0].path,
              disabilitycertificates: req.files.disabilitycertificates?.[0]?.path||null,
              chiefsletter: req.files.chiefsletter[0].path,
              passportphoto: req.files.passportphoto[0].path,
              DeathCertificates:req.files.DeathCertificates?.[0]?.path || null,
            },
          },
        },
      });

      await verificationQueue.add("verify", {
        type: "credentials reuse",
        applicationid: saveapplicant.id,
        guardianID,
        nameinput,
        gender,
        bithcertno,
        guardianname,
        schoolname,
        Assesmentno,
        schoolcounty,
        Guardian_krapin,
        bithcertno,
        countyresidence,
        Ipaddress,
        disabilitystatus,
        guardianlocation,
        guardiansincome,
        admissionno,
        currentform,
        kcpeyear,
        personalemail,

        files: {
          birthcertificate: req.files.birthcertificate[0].path,
          admissionletter: req.files.admissionletter[0].path,
          feestructure: req.files.feestructure[0].path,
          schoolreport: req.files.schoolreport[0].path,
          guardiannationalid: req.files.guardiannationalid[0].path,
          proofofincome: req.files.proofofincome[0].path,
          disabilitycertificates: req.files.disabilitycertificates?.[0]?.path||null,
          chiefsletter: req.files.chiefsletter[0].path,
          passportphoto: req.files.passportphoto[0].path,
          DeathCertificates: req.files.DeathCertificates?.[0]?.path || null
        },
      });

      const randomNumber = Math.random();

      if (randomNumber < 0.1) {
        await prisma.Application.update({
          where: { id: saveapplicant.id },
          data: { status: "random_audit" },
        });
        logger.warn(
          `Application ${saveapplicant.id} selected for random audit`,
        );
      }

      logger.info(`${nameinput} submitted application succesfully`);
         
      try {
        const send = getresend();
        await send.emails.send({
          from:'onboarding@resend.dev',
          to:personalemail,
          subject:"Application Received — Smart Bursary Portal",
          html:
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <h2 style="color: #166534; border-bottom: 2px solid #166534; padding-bottom: 10px;">
          Application Received 
        </h2>
        
        <p>Hello <strong>${nameinput}</strong>,</p>
        
        <p>Your bursary application has been successfully received and is currently being verified by our fraud detection system.</p>
        
        <div style="background: #f0fdf4; border-left: 4px solid #166534; padding: 15px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Application ID:</strong> ${saveapplicant.id}</p>
          <p style="margin: 5px 0;"><strong>School:</strong> ${schoolname}</p>
          <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleDateString('en-KE')}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Processing...</p>
        </div>
        
        <p>You will receive another email once verification is complete. Please do not resubmit your application.</p>
        
        <p style="color: #666; font-size: 13px;">
          If you did not submit this application please contact us immediately at 
          <a href="mailto:hello@smartbursary.co.ke">hello@smartbursary.co.ke</a>
        </p>
        
        <br/>
        <p style="color: #166534; font-weight: bold;">Smart Bursary Portal</p>
        <p style="font-size: 12px; color: #666;">Kenya's County Fraud Detection System</p>
        
      </div>
          `
          
        })
        console.log(`Confirmation email sent to ${personalemail}`);
      } catch (error) {
        console.log(error);
        
        
      }
     

      return res.status(200).json({
        message: `Dear ${nameinput} your Application has been recieved  wait for processing`,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Something went wrong check and try again" });
    }
  },
);
module.exports = router;
