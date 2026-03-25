const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const extractdocumentdata = async (filepath) => {
  if (!filepath) return null;
  let localPath = filepath;
  let tempFile = null;
  if (filepath.startsWith('http')) {
    tempFile = path.join('uploads_tmp', `${uuidv4()}.jpg`);
    try {
      const response = await axios.get(filepath, { responseType: 'stream' });
      const writer = fs.createWriteStream(tempFile);
      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      localPath = tempFile;
    } catch (err) {
      console.error(`[OCR] Failed to download from Cloudinary: ${err.message}`);
      return null;
    }
  }
  for (let ocrAttempt = 1; ocrAttempt <= 2; ocrAttempt++) {
    try {
      let filesize = null;
      try { filesize = fs.statSync(localPath).size; } catch (err) {}
      console.log(`[OCR] Attempt ${ocrAttempt} — processing ${localPath}, size: ${filesize ?? 'unknown'} bytes`);
      const form = new FormData();
      form.append('file', fs.createReadStream(localPath));
      form.append('language', 'eng');
      form.append('isOverlayRequired', 'false');
      form.append('scale', 'true');
      form.append('detectOrientation', 'true');
      form.append('OCREngine', '2');
      const ocrres = await axios.post('https://api.ocr.space/parse/image', form, {
        headers: { ...form.getHeaders(), 'apikey': process.env.OCRAPIKEY },
        timeout: 120000,
      });
      const parsedResult = ocrres.data?.ParsedResults?.[0];
      const text = parsedResult?.ParsedText || '';
      const apiErrorMsg = ocrres.data?.ErrorMessage;
      const exitCode = ocrres.data?.OCRExitCode;
      if (apiErrorMsg || (exitCode !== undefined && exitCode !== 1)) return null;
      if (parsedResult?.ErrorMessage) return null;
      if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return text;
    } catch (err) {
      console.error(`[OCR] Attempt ${ocrAttempt} failed: ${err.message}`);
      if (ocrAttempt === 2) {
        if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        return null;
      }
    }
  }
};

const normalize = (str) => str?.toLowerCase().replace(/\s+/g, ' ').trim() || '';

const checkBirthCertificate = async (filepath, nameinput, bithcertno, gender) => {
  const flags = [];
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'Birth certificate could not be read' }];
  const t = normalize(text);
  const firstName = normalize(nameinput).split(' ')[0];
  if (!t.includes(firstName)) flags.push({ reason: 'Name on birth certificate does not match application' });
  if (bithcertno && !t.includes(normalize(bithcertno))) flags.push({ reason: 'Birth certificate number not found in document' });
  return flags;
};

const checkNationalID = async (filepath, guardianname, guardianID) => {
  const flags = [];
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'National ID could not be read' }];
  const t = normalize(text);
  const firstName = normalize(guardianname).split(' ')[0];
  if (!t.includes(firstName)) flags.push({ reason: 'Guardian name on ID does not match application' });
  if (guardianID && !t.includes(guardianID)) flags.push({ reason: 'Guardian ID number not found in document' });
  return flags;
};

const checkAdmissionLetter = async (filepath, schoolname, admissionno, nameinput) => {
  const flags = [];
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'Admission letter could not be read' }];
  const t = normalize(text);
  const firstName = normalize(nameinput).split(' ')[0];
  const school = normalize(schoolname).split(' ')[0];
  if (!t.includes(firstName)) flags.push({ reason: 'Student name on admission letter does not match' });
  if (!t.includes(school)) flags.push({ reason: 'School name on admission letter does not match' });
  if (admissionno && !t.includes(normalize(admissionno))) flags.push({ reason: 'Admission number not found in letter' });
  return flags;
};

const checkSchoolReport = async (filepath, nameinput, schoolname, admissionno, govKnecCode) => {
  const flags = [];
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'School report could not be read' }];
  const t = normalize(text);
  const firstName = normalize(nameinput).split(' ')[0];
  if (!t.includes(firstName)) flags.push({ reason: 'Student name on school report does not match' });
  if (govKnecCode && !t.includes(normalize(govKnecCode))) flags.push({ reason: 'KNEC code not found in school report' });
  return flags;
};

const checkChiefsLetter = async (filepath, guardianlocation) => {
  const flags = [];
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: "Chief's letter could not be read" }];
  const t = normalize(text);
  const location = normalize(guardianlocation).split(' ')[0];
  if (!t.includes(location)) flags.push({ reason: "Location on chief's letter does not match application" });
  return flags;
};

const checkProofOfIncome = async (filepath, guardianname, guardiansincome) => {
  const flags = [];
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'Proof of income could not be read' }];
  const t = normalize(text);
  const firstName = normalize(guardianname).split(' ')[0];
  if (!t.includes(firstName)) flags.push({ reason: 'Guardian name on income proof does not match' });
  return flags;
};

const checkDisabilityCertificate = async (filepath, nameinput, disabilitystatus) => {
  const flags = [];
  if (disabilitystatus !== 'disabled') return flags;
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'Disability certificate could not be read' }];
  const t = normalize(text);
  const firstName = normalize(nameinput).split(' ')[0];
  if (!t.includes(firstName)) flags.push({ reason: 'Name on disability certificate does not match' });
  return flags;
};

const checkDeathCertificate = async (filepath, guardianname, orphanstatus) => {
  const flags = [];
  if (orphanstatus === 'Not orphan') return flags;
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'Death certificate could not be read' }];
  const t = normalize(text);
  const firstName = normalize(guardianname).split(' ')[0];
  if (!t.includes(firstName)) flags.push({ reason: 'Name on death certificate does not match' });
  return flags;
};

module.exports = {
  extractdocumentdata,
  checkBirthCertificate,
  checkNationalID,
  checkAdmissionLetter,
  checkSchoolReport,
  checkChiefsLetter,
  checkProofOfIncome,
  checkDisabilityCertificate,
  checkDeathCertificate,
};
