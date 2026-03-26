const { Worker } = require("bullmq");
const connection = require("../bullmq/connection");
const prisma = require("../prisma.client");
const axios = require("axios");
const https = require("https");
const logger = require('../security/winston');

const { checkMultiYearConsistency } = require('./multiyearcons');
const { culcateFraudscore, getstatus } = require('./scoreengine');
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

    const firstname = nameinput?.split(" ")[0]?.toLowerCase() || "";
    const schoolfirst = schoolname?.split(" ")[0]?.toLowerCase() || "";

    if (!files) throw new Error("Files object missing");

    // ------------------ DUPLICATE CHECKS ------------------
    const [krareuse, idreuse, birthcertuse, ipadresscount] = await Promise.all([
      prisma.Application.count({
        where: { Guardian_krapin, NOT: { id: applicationid } },
      }),
      prisma.Application.count({
        where: { guardianID, NOT: { id: applicationid } },
      }),
      prisma.Application.count({
        where: { bithcertno, NOT: { id: applicationid } },
      }),
      prisma.Application.count({
        where: { Ipaddress, NOT: { id: applicationid } },
      }),
    ]);

    if (krareuse) flags.push({ reason: 'KRA pin already used in other applications' });
    if (idreuse) flags.push({ reason: 'ID already used in another application' });
    if (birthcertuse) flags.push({ reason: 'Birth certificate reused' });
    if (ipadresscount > 50) flags.push({ reason: 'Too many applications from same IP' });

    // ------------------ KNEC CHECK ------------------
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

      const knecStudent = knecRes.data;

      if (!knecStudent?.candidateName?.toLowerCase().includes(firstname)) {
        flags.push({ reason: "Name mismatch with KNEC" });
      }

      const g = knecStudent.gender?.toLowerCase();
      const knecGender = (g === 'm' || g === 'male') ? 'male' : (g === 'f' || g === 'female') ? 'female' : null;

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
      if (kraresults.flags?.length) flags.push(...kraresults.flags);
    } catch {
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

      results.forEach(r => {
        if (Array.isArray(r)) flags.push(...r);
      });
    } catch {
      flags.push({ reason: "OCR processing failed" });
    }

    // ------------------ MULTI-YEAR ------------------
    try {
      const yearflags = await checkMultiYearConsistency(
        applicationid, nameinput, bithcertno, Assesmentno,
        currentform, schoolname, kcpeyear, dob
      );
      if (yearflags?.length) flags.push(...yearflags);
    } catch {
      flags.push({ reason: "Multi-year validation failed" });
    }

    // ------------------ FACE ------------------
    try {
      const { flags: faceflags, descriptor } = await checkface(files.passportphoto, applicationid);
      if (faceflags?.length) flags.push(...faceflags);

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
    if (personalemail) {
      const send = getresend();
      await send.emails.send({
        from: 'onboarding@resend.dev',
        to: personalemail,
        subject: `Application ${status} — Smart Bursary Portal`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${status === 'verified' ? '#166534' : status === 'Manual review' ? '#ca8a04' : '#dc2626'}; border-bottom: 2px solid currentColor; padding-bottom: 10px;">
            ${status === 'verified' ? 'Application Approved' : status === 'Manual review' ? 'Under Review 🔍' : 'Application Rejected'}
          </h2>
          <p>Hello <strong>${nameinput}</strong>,</p>
          ${status === 'verified' ? '<p>Congratulations! Your bursary application has passed all verification checks.</p>'
            : status === 'Manual review' ? '<p>Your application requires additional manual review by our team.</p>'
            : '<p>Unfortunately your application did not pass our verification checks.</p>'
          }
          <div style="background: #f0fdf4; border-left: 4px solid #166534; padding: 15px; margin: 20px 0;">
            <p><strong>Application ID:</strong> ${applicationid}</p>
            <p><strong>Status:</strong> ${status}</p>
            <p><strong>Fraud Score:</strong> ${fraudscore}</p>
            <p><strong>Processed:</strong> ${new Date().toLocaleDateString('en-KE')}</p>
          </div>
          <p style="color: #666; font-size: 13px;">For queries contact <a href="mailto:hello@smartbursary.co.ke">hello@smartbursary.co.ke</a></p>
        </div>`
      });
      logger.info(`Result email sent to ${personalemail} — ${status}`);
    }

    return { applicationid, flags, status };
  },
  { connection, concurrency: 5 }
);

module.exports = worker;
