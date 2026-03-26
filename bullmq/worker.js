const { Worker } = require("bullmq");
const connection = require("../bullmq/connection");
const prisma = require("../prisma.client");
const axios = require("axios");
const { checkMultiYearConsistency } = require('./multiyearcons');
const { culcateFraudscore, getstatus } = require('./scoreengine');
const logger = require('../security/winston');
const https = require('https');
const { checkface } = require('./facehash');
const getresend = require('../helpers/email');
const { checkKRA } = require("./kra");

const {
  checkBirthCertificate,
  checkNationalID,
  checkAdmissionLetter,
  checkChiefsLetter,
  checkProofOfIncome,
  checkSchoolReport,
  checkDisabilityCertificate,
  checkDeathCertificate,
} = require("./ocrextract");

const worker = new Worker(
  "verification",
  async (job) => {
    const {
      applicationid, guardianID, nameinput, guardianname, gender,
      schoolname, Guardian_krapin, bithcertno,
      countyresidence, Ipaddress, Assesmentno, disabilitystatus,
      guardianlocation, guardiansincome, admissionno, currentform,
      kcpeyear, dob, files, orphanstatus, personalemail,
    } = job.data;

    const flags = [];
    let govKnecCode = null;

    // ✅ Normalize inputs once
    const firstname = nameinput?.split(" ")[0]?.toLowerCase() || "";
    const schoolfirst = schoolname?.split(" ")[0]?.toLowerCase() || "";

    if (!files) throw new Error("Files object missing");

    // ------------------ DUPLICATE CHECKS ------------------
    const [krareuse, idreuse, birthcertuse, ipadresscount] = await Promise.all([
      prisma.Application.count({ where: { Guardian_krapin, NOT: { id: applicationid } } }),
      prisma.Application.count({ where: { guardianID, NOT: { id: applicationid } } }),
      prisma.Application.count({ where: { bithcertno, NOT: { id: applicationid } } }),
      prisma.Application.count({ where: { Ipaddress, NOT: { id: applicationid } } }),
    ]);

    if (krareuse > 0) flags.push({ reason: 'KRA pin already used in other applications' });
    if (idreuse > 0) flags.push({ reason: 'ID already used in another application' });
    if (birthcertuse > 0) flags.push({ reason: 'Birth certificate reused' });
    if (ipadresscount > 50) flags.push({ reason: 'Too many applications from same IP' });

    // ------------------ KNEC CHECK ------------------
    let knecStudent = null;

    try {
      const knecRes = await axios.get(
        "https://kjsea.knec.ac.ke/api/search",
        {
          params: { assessmentNumber: Assesmentno, name: firstname },
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          timeout: 30000,
        }
      );

      knecStudent = knecRes.data;

      if (!knecStudent?.candidateName?.toLowerCase().includes(firstname)) {
        flags.push({ reason: "Name mismatch with KNEC" });
      }

      const g = knecStudent.gender?.toLowerCase();
      let knecGender = null;
      if (g === "m" || g === "male") knecGender = "male";
      else if (g === "f" || g === "female") knecGender = "female";

      if (knecGender && knecGender !== gender?.toLowerCase()) {
        flags.push({ reason: "Gender mismatch with KNEC" });
      }

      if (!knecStudent.centreName?.toLowerCase().includes(schoolfirst)) {
        flags.push({ reason: "School mismatch with KNEC" });
      }

      govKnecCode = knecStudent.centreCode || null;

      logger.info(`KNEC OK: ${knecStudent.candidateName}`);

    } catch (error) {
      flags.push({ reason: "KNEC unavailable" });
      logger.error(`KNEC failed: ${error.message}`);
    }

    // ------------------ KRA ------------------
    try {
      const kraresults = await checkKRA(Guardian_krapin, guardianname);
      flags.push(...kraresults.flags);
    } catch (error) {
      flags.push({ reason: "KRA verification failed" });
    }

    // ------------------ OCR ------------------
    try {
      const results = await Promise.all([
        checkBirthCertificate(files.birthcertificate, nameinput, bithcertno, gender),
        checkNationalID(files.guardiannationalid, guardianname, guardianID),
        checkAdmissionLetter(files.admissionletter, schoolname, admissionno, nameinput),
        checkSchoolReport(files.schoolreport, nameinput, schoolname, admissionno, govKnecCode),
        checkChiefsLetter(files.chiefsletter, guardianlocation),
        checkProofOfIncome(files.proofofincome, guardianname, guardiansincome),
        checkDisabilityCertificate(files.disabilitycertificates, nameinput, disabilitystatus),
        checkDeathCertificate(files.deathcertificate, guardianname, orphanstatus),
      ]);

      results.forEach(r => flags.push(...r));

    } catch (error) {
      flags.push({ reason: "OCR processing failed" });
      logger.error(error.message);
    }

    // ------------------ MULTI-YEAR ------------------
    try {
      const yearflags = await checkMultiYearConsistency(
        applicationid, nameinput, bithcertno, Assesmentno,
        currentform, schoolname, kcpeyear, dob
      );
      flags.push(...yearflags);
    } catch (error) {
      flags.push({ reason: "Multi-year validation failed" });
    }

    // ------------------ FACE ------------------
    try {
      const { flags: faceflags, descriptor } = await checkface(files.passportphoto, applicationid);
      flags.push(...faceflags);

      if (descriptor) {
        await prisma.Application.update({
          where: { id: applicationid },
          data: { faceDescriptor: descriptor },
        });
      }
    } catch {
      flags.push({ reason: "Face verification failed" });
    }

    // ------------------ FINAL SCORE ------------------
    const fraudscore = culcateFraudscore(flags);
    const status = getstatus(fraudscore);

    await prisma.Application.update({
      where: { id: applicationid },
      data: { flags, status, fraudscore },
    });

    // ------------------ EMAIL ------------------
    try {
      if (personalemail) {
        const send = getresend();

        await send.emails.send({
          from: 'onboarding@resend.dev',
          to: personalemail,
          subject: `Application ${status}`,
          html: `<p>Status: ${status}</p><p>Score: ${fraudscore}</p>`
        });

        logger.info(`Email sent to ${personalemail}`);
      }
    } catch (e) {
      logger.error(`Email failed: ${e.message}`);
    }

    logger.warn(`Application ${applicationid} → ${status}`);
    return { applicationid, flags, status };
  },
  { connection, concurrency: 5 }
);

module.exports = worker;
