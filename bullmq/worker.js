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
      schoolname, schoolcounty, Guardian_krapin, bithcertno,
      countyresidence, Ipaddress, Assesmentno, disabilitystatus,
      guardianlocation, guardiansincome, admissionno, currentform,
      kcpeyear, dob, files, orphanstatus, personalemail,
    } = job.data;

    const flags = [];
    let govKnecCode = null;

    const [krareuse, idreuse, birthcertuse, ipadresscount] = await Promise.all([
      prisma.Application.count({ where: { Guardian_krapin, NOT: { id: applicationid } } }),
      prisma.Application.count({ where: { guardianID, NOT: { id: applicationid } } }),
      prisma.Application.count({ where: { bithcertno, NOT: { id: applicationid } } }),
      prisma.Application.count({ where: { Ipaddress } }),
    ]);

    if (krareuse > 0) flags.push({ reason: 'KRA pin already used in other applications' });
    if (idreuse > 0) flags.push({ reason: 'ID already used in another application' });
    if (birthcertuse > 0) flags.push({ reason: 'Birth certificate number already used somewhere else' });
    if (ipadresscount > 50) flags.push({ reason: 'More than 50 applications coming from this IP' });


    
 try {
  const knecRes = await axios.get(
    "https://kjsea.knec.ac.ke/api/search",
    {
      params: { 
        assessmentNumber: Assesmentno, 
        name: nameinput.split(" ")[0] // first name only
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://kjsea.knec.ac.ke/"
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 30000,
    }
  );

  const student = knecRes.data;

  // Name check
  if (!student.candidateName?.toLowerCase().includes(nameinput?.toLowerCase().split(" ")[0])) {
    flags.push({ reason: "Student name doesn't match KNEC records" });
  }

  // Gender check
  const knecGender = student.gender?.trim().toLowerCase() === "m" ? "male" : "female";
  if (knecGender !== gender?.toLowerCase()) {
    flags.push({ reason: "Gender does not match KNEC records" });
  }

  // School check
  if (!student.centreName?.toLowerCase().includes(schoolname?.toLowerCase().split(" ")[0])) {
    flags.push({ reason: "School name does not match KNEC centre" });
  }

  // Save centre code for school report cross-check
  govKnecCode = student.centreCode || null;

  logger.info(`KNEC check: ${student.candidateName} | ${student.gender} | ${student.centreName} | Code: ${govKnecCode}`);

} catch (error) {
  const isTimeout = error.code === "ECONNABORTED" || error.message?.includes("timeout");
  if (isTimeout) {
    flags.push({ reason: "KNEC database did not respond in time" });
  } else {
    flags.push({ reason: "Could not reach KNEC database" });
  }
  logger.error(`KNEC API failed for assessment ${Assesmentno}: ${error.message}`);
}

      const data = ministryRes.data;
      if (!data.success) {
        flags.push({ reason: "Assessment number not found in government database" });
      } else {
        const student = data.response.student;
        const returnedname = student.student_name?.toLowerCase() || "";
        if (!returnedname.includes(nameinput?.toLowerCase().split(" ")[0])) {
          flags.push({ reason: "Student name doesn't match government records" });
        }
        const gokgender = student.gender?.toLowerCase() === "m" ? "male" : "female";
        if (gokgender !== gender?.toLowerCase()) {
          flags.push({ reason: "Gender does not match government records" });
        }
        const gokNormalized = student.disability?.toLowerCase() === "none" ? "not disabled" : "disabled";
        if (gokNormalized !== disabilitystatus?.toLowerCase()) {
          flags.push({ reason: "Disability status does not match government records" });
        }
        const returnedcounty = student.county_of_residence?.toLowerCase() || "";
        if (!returnedcounty.includes(countyresidence?.toLowerCase())) {
          flags.push({ reason: "County of residence doesn't match government database" });
        }
        govKnecCode = student.knec_code || null;
        logger.info(`Ministry check: ${student.student_name} | ${student.gender} | ${student.county_of_residence} | KNEC: ${govKnecCode}`);
      }
    } catch (error) {
      const isTimeout = error.code === "ECONNABORTED" || error.message?.includes("timeout");
      if (isTimeout) {
        flags.push({ reason: "Ministry of Education database did not respond in time" });
        logger.error(`Ministry API timed out after retry for assessment ${Assesmentno}: ${error.message}`);
      } else {
        flags.push({ reason: "Could not reach ministry of education database" });
        logger.error(`Ministry API failed for assessment ${Assesmentno}: ${error.message}`);
      }
    }

    try {
      const kraresults = await checkKRA(Guardian_krapin, guardianname);
      flags.push(...kraresults.flags);
    } catch (error) {
      flags.push({ reason: "KRA verification incomplete" });
      logger.error(`KRA check failed: ${error.message}`);
    }

    try {
      const [
        birthflags, idflags, admissionflags, reportflags,
        chiefsflags, incomeflags, disabilityflags, deathflags,
      ] = await Promise.all([
        checkBirthCertificate(files.birthcertificate, nameinput, bithcertno, gender),
        checkNationalID(files.guardiannationalid, guardianname, guardianID),
        checkAdmissionLetter(files.admissionletter, schoolname, admissionno, nameinput),
        checkSchoolReport(files.schoolreport, nameinput, schoolname, admissionno, govKnecCode),
        checkChiefsLetter(files.chiefsletter, guardianlocation),
        checkProofOfIncome(files.proofofincome, guardianname, guardiansincome),
        checkDisabilityCertificate(files.disabilitycertificates, nameinput, disabilitystatus),
        checkDeathCertificate(files.deathcertificate, guardianname, orphanstatus),
      ]);
      flags.push(...birthflags, ...idflags, ...admissionflags, ...reportflags,
        ...chiefsflags, ...incomeflags, ...disabilityflags, ...deathflags);
    } catch (error) {
      logger.error(`OCR failed: ${error.message}`);
      flags.push({ reason: `Document verification error: ${error.message}` });
    }

    try {
      const yearflags = await checkMultiYearConsistency(
        applicationid, nameinput, bithcertno, Assesmentno,
        currentform, schoolname, kcpeyear, dob,
      );
      flags.push(...yearflags);
    } catch (error) {
      flags.push({ reason: `Multi year check failed: ${error.message}` });
      logger.error(`Multi year check failed: ${error.message}`);
    }

    try {
      const { flags: faceflags, descriptor } = await checkface(files.passportphoto, applicationid);
      flags.push(...faceflags);
      if (descriptor) {
        await prisma.Application.update({
          where: { id: applicationid },
          data: { faceDescriptor: descriptor },
        });
      }
    } catch (error) {
      flags.push({ reason: 'Face verification could not be completed' });
      logger.error(`Face check failed: ${error.message}`);
    }

    const fraudscore = culcateFraudscore(flags);
    const status = getstatus(fraudscore);

    await prisma.Application.update({
      where: { id: applicationid },
      data: { flags, status, fraudscore },
    });

    try {
      if (personalemail) {
        const send = getresend();
        await send.emails.send({
          from: 'onboarding@resend.dev',
          to: personalemail,
          subject: `Application ${status} — Smart Bursary Portal`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: ${status === 'verified' ? '#166534' : status === 'Manual review' ? '#ca8a04' : '#dc2626'}; border-bottom: 2px solid currentColor; padding-bottom: 10px;">
                ${status === 'verified' ? 'Application Approved' : status === 'Manual review' ? 'Under Review 🔍' : 'Application Rejected'}
              </h2>
              <p>Hello <strong>${nameinput}</strong>,</p>
              ${status === 'verified' ?
                '<p>Congratulations! Your bursary application has passed all verification checks.</p>' :
                status === 'Manual review' ?
                '<p>Your application requires additional manual review by our team.</p>' :
                '<p>Unfortunately your application did not pass our verification checks.</p>'
              }
              <div style="background: #f0fdf4; border-left: 4px solid #166534; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Application ID:</strong> ${applicationid}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> ${status}</p>
                <p style="margin: 5px 0;"><strong>Fraud Score:</strong> ${fraudscore}</p>
                <p style="margin: 5px 0;"><strong>Processed:</strong> ${new Date().toLocaleDateString('en-KE')}</p>
              </div>
              <p style="color: #666; font-size: 13px;">For any queries contact us at <a href="mailto:hello@smartbursary.co.ke">hello@smartbursary.co.ke</a></p>
              <br/>
              <p style="color: #166534; font-weight: bold;">Smart Bursary Portal</p>
              <p style="font-size: 12px; color: #666;">Kenya's County Fraud Detection System</p>
            </div>
          `
        });
        logger.info(`Result email sent to ${personalemail} — ${status}`);
      }
    } catch (emailerror) {
      logger.error(`Result email failed: ${emailerror.message}`);
    }

    logger.warn(`Application ${applicationid} scored ${fraudscore} — ${status}`);
    return { applicationid, flags, status };
  },
  { connection, concurrency: 5 },
);

worker.on("completed", (job) => {
  console.log(`${job.data.applicationid} — ${job.returnvalue.status}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

module.exports = worker;
