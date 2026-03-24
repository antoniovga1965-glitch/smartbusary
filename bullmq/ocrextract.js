const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { distance } = require('fastest-levenshtein');
require('dotenv').config();



const namesMatch = (name1, name2, threshold = 3) => {
  const a = name1?.toLowerCase().trim() || '';
  const b = name2?.toLowerCase().trim() || '';
  if (a.includes(b) || b.includes(a)) return true;
  const firstName1 = a.split(' ')[0];
  const firstName2 = b.split(' ')[0];
  return distance(firstName1, firstName2) <= threshold;
};

const extractdocumentdata = async (filepath) => {
  if (!filepath) return null;

  for (let ocrAttempt = 1; ocrAttempt <= 2; ocrAttempt++) {
    try {
      // Log file metadata before sending to OCR.space
      let filesize = null;
      try {
        const stat = fs.statSync(filepath);
        filesize = stat.size;
      } catch (staterr) {
        console.warn(`[OCR] Could not stat file ${filepath}:`, staterr.message);
      }
      console.log(`\n[OCR] Sending file to OCR.space — path: ${filepath}, size: ${filesize !== null ? `${filesize} bytes` : 'unknown'}`);
      console.log(`OCR.space attempt ${ocrAttempt} for ${filepath}...`);

      const form = new FormData();
      form.append('file', fs.createReadStream(filepath));
      form.append('language', 'eng');
      form.append('isOverlayRequired', 'false');
      form.append('scale', 'true');
      form.append('detectOrientation', 'true');
      form.append('OCREngine', '2');

      const ocrres = await axios.post(
        'https://api.ocr.space/parse/image',
        form,
        {
          headers: {
            ...form.getHeaders(),
            'apikey': process.env.OCRAPIKEY,
          },
          timeout: 120000,
        }
      );

      // Log HTTP status and full raw response for diagnostics
      console.log(`[OCR] HTTP status: ${ocrres.status}`);
      console.log(`[OCR] Full response for ${filepath}:`, JSON.stringify(ocrres.data, null, 2));

      // Check for an API-level error returned in the response body
      const apiErrorMsg = ocrres.data?.ErrorMessage;
      const exitCode = ocrres.data?.OCRExitCode;
      if (apiErrorMsg || (exitCode !== undefined && exitCode !== 1)) {
        const errorDetail = Array.isArray(apiErrorMsg) ? apiErrorMsg.join('; ') : (apiErrorMsg || 'unknown error');
        console.error(`[OCR] OCR.space API error for ${filepath} — exit code: ${exitCode}, message: ${errorDetail}`);
        return null;
      }

      const parsedResult = ocrres.data?.ParsedResults?.[0];
      const resultErrorMsg = parsedResult?.ErrorMessage;
      if (resultErrorMsg) {
        console.error(`[OCR] OCR.space parse error for ${filepath}:`, resultErrorMsg);
        return null;
      }

      const text = parsedResult?.ParsedText || '';
      console.log(`\n=== OCR RESULT: ${filepath} ===`);
      console.log(text || '(empty — no text extracted)');
      console.log(`=== END OCR ===\n`);

      if (!text) {
        console.warn(`[OCR] OCR.space returned empty ParsedText for ${filepath} — document may be unreadable, unsupported format, or image quality too low`);
      }

      return text;
    } catch (err) {
      console.error(`OCR attempt ${ocrAttempt} failed for ${filepath}:`, err.message);
      if (ocrAttempt === 2) {
        // distinguish between network and generic failure
        if (err.response) {
          console.error(`[OCR] HTTP error — status: ${err.response.status}, body:`, JSON.stringify(err.response.data));
        } else if (err.request) {
          console.error(`[OCR] Network error — no response received (timeout or connectivity issue):`, err.message);
        } else {
          console.error(`[OCR] Request setup error:`, err.message);
        }
        return null;
      }
      console.log(`Retrying OCR for ${filepath}...`);
    }
  }
};



const checkBirthCertificate = async (filepath, nameinput, bithcertno, gender) => {
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'OCR failed — birth certificate could not be read' }];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const flags = [];

  const getAfter = (keyword) => {
    const idx = lines.findIndex(l => l.toUpperCase().includes(keyword.toUpperCase()));
    return idx !== -1 ? lines[idx + 1] : null;
  };

  const entryno = getAfter('No.');
  const nameIdx = lines.findIndex(l => l.toUpperCase().includes('PROVINCE'));
  const studentname = nameIdx !== -1 ? lines[nameIdx + 1] : null;
  const sex = lines.find(l => l.toLowerCase() === 'male' || l.toLowerCase() === 'female');

  if (entryno && entryno !== bithcertno) {
    flags.push({ reason: 'Birth certificate number does not match uploaded certificate' });
  }
  if (studentname && !namesMatch(studentname, nameinput)) {
    flags.push({ reason: 'Student name does not match birth certificate' });
  }
  if (sex && !sex.toLowerCase().includes(gender?.toLowerCase())) {
    flags.push({ reason: 'Gender does not match birth certificate' });
  }

  return flags;
};

const checkDeathCertificate = async (filepath, guardianname, orphanstatus) => {
  if (orphanstatus === 'Not orphan') return [];

  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'OCR failed — death certificate could not be read' }];

  const lower = text.toLowerCase();
  const flags = [];

  const keywords = ['republic of kenya', 'certificate of death', 'civil registration', 'registrar', 'death'];
  const found = keywords.filter(k => lower.includes(k));
  if (found.length < 3) {
    flags.push({ reason: 'Death certificate missing official keywords — may be fake' });
  }
  if (!namesMatch(text, guardianname)) {
    flags.push({ reason: 'Name on death certificate does not match guardian records' });
  }

  return flags;
};

const checkNationalID = async (filepath, guardianname, guardianID) => {
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'OCR failed — national ID could not be read' }];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const flags = [];

  const getAfter = (keyword) => {
    const idx = lines.findIndex(l => l.toUpperCase().includes(keyword.toUpperCase()));
    return idx !== -1 ? lines[idx + 1] : null;
  };

  const surname = getAfter('SURNAME');
  const givenname = getAfter('GIVEN NAME');
  const idnumber = getAfter('ID NUMBER');
  const fullname = `${surname} ${givenname}`.trim();

  if (idnumber && idnumber.replace(/\s/g, '') !== guardianID) {
    flags.push({ reason: 'Guardian ID number does not match uploaded National ID' });
  }
  if (fullname && !namesMatch(fullname, guardianname)) {
    flags.push({ reason: 'Guardian name does not match National ID' });
  }

  return flags;
};

const checkKRACertificate = async (filepath, Guardian_krapin, guardianname) => {
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'OCR failed — KRA certificate could not be read' }];

  const lower = text.toLowerCase();
  const flags = [];

  if (Guardian_krapin && !text.includes(Guardian_krapin)) {
    flags.push({ reason: 'KRA PIN does not match uploaded KRA certificate' });
  }
  if (!namesMatch(text, guardianname)) {
    flags.push({ reason: 'Guardian name does not match KRA certificate' });
  }

  return flags;
};

const checkAdmissionLetter = async (filepath, schoolname, admissionno, nameinput) => {
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'OCR failed — admission letter could not be read' }];

  const lower = text.toLowerCase();
  const flags = [];

  const schoolfirst = schoolname?.split(' ')[0]?.toLowerCase() || '';
  if (!lower.includes(schoolfirst)) {
    flags.push({ reason: 'School name does not match admission letter' });
  }
  if (admissionno && !text.includes(admissionno)) {
    flags.push({ reason: 'Admission number does not match uploaded letter' });
  }
  if (!namesMatch(text, nameinput)) {
    flags.push({ reason: 'Student name not found in admission letter' });
  }

  return flags;
};

const checkSchoolReport = async (filepath, nameinput, schoolname, admissionno, govKnecCode) => {
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'OCR failed — school report could not be read' }];

  const lower = text.toLowerCase();
  const flags = [];

  if (!namesMatch(text, nameinput)) {
    flags.push({ reason: 'Student name not found in school report' });
  }
  const schoolfirst = schoolname?.split(' ')[0]?.toLowerCase() || '';
  if (!lower.includes(schoolfirst)) {
    flags.push({ reason: 'School name does not match school report' });
  }
  if (admissionno && !text.includes(admissionno)) {
    flags.push({ reason: 'Admission number in school report does not match' });
  }

  
  const indexMatch = text.match(/(\d{8})\/\d+/);
  const slipKnecCode = indexMatch?.[1];
  if (slipKnecCode && govKnecCode && slipKnecCode !== govKnecCode) {
    flags.push({ reason: `School code on result slip (${slipKnecCode}) does not match government records (${govKnecCode})` });
  }

  return flags;
};

const checkChiefsLetter = async (filepath, guardianlocation) => {
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'OCR failed — chiefs letter could not be read' }];

  const lower = text.toLowerCase();
  const flags = [];

  const keywords = ['chief', 'location', 'sub-location', 'administration', 'signed', 'stamp'];
  const found = keywords.filter(k => lower.includes(k));
  if (found.length < 3) {
    flags.push({ reason: 'Chiefs letter missing official keywords — may be fake' });
  }

  const location = guardianlocation?.split(' ')[0]?.toLowerCase() || '';
  if (location && !lower.includes(location)) {
    flags.push({ reason: 'Location in chiefs letter does not match declared residence' });
  }

  return flags;
};

const checkProofOfIncome = async (filepath, guardianname, guardiansincome) => {
  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'OCR failed — proof of income could not be read' }];

  const lower = text.toLowerCase();
  const flags = [];

  const keywords = ['salary', 'income', 'earnings', 'employer', 'payslip', 'net pay'];
  const found = keywords.filter(k => lower.includes(k));
  if (found.length < 2) {
    flags.push({ reason: 'Proof of income missing key financial keywords — may be fake' });
  }
  if (!namesMatch(text, guardianname)) {
    flags.push({ reason: 'Guardian name not found in proof of income' });
  }

  return flags;
};

const checkDisabilityCertificate = async (filepath, nameinput, disabilitystatus) => {
  if (disabilitystatus?.toLowerCase() !== 'disabled') return [];

  const text = await extractdocumentdata(filepath);
  if (!text) return [{ reason: 'OCR failed — disability certificate could not be read' }];

  const lower = text.toLowerCase();
  const flags = [];

  const keywords = ['ncpwd', 'national council', 'persons with disabilities', 'registration', 'disability'];
  const found = keywords.filter(k => lower.includes(k));
  if (found.length < 3) {
    flags.push({ reason: 'Disability certificate missing NCPWD official keywords — may be fake' });
  }
  if (!namesMatch(text, nameinput)) {
    flags.push({ reason: 'Student name does not match disability certificate' });
  }

  const disabilitytypes = ['physical', 'visual', 'hearing', 'intellectual', 'psychosocial', 'developmental'];
  const foundtype = disabilitytypes.find(d => lower.includes(d));
  if (!foundtype) {
    flags.push({ reason: 'Disability certificate does not specify recognized disability type' });
  }

  return flags;
};

module.exports = {
  checkBirthCertificate,
  checkNationalID,
  checkKRACertificate,
  checkAdmissionLetter,
  checkChiefsLetter,
  checkProofOfIncome,
  checkSchoolReport,
  checkDisabilityCertificate,
  checkDeathCertificate,
};