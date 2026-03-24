const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const extractdocumentdata = async (filepath) => {
  if (!filepath) return null;

  for (let ocrAttempt = 1; ocrAttempt <= 2; ocrAttempt++) {
    try {
      // Get file size for logging
      let filesize = null;
      try {
        filesize = fs.statSync(filepath).size;
      } catch (err) {
        console.warn(`[OCR] Could not read file size for ${filepath}: ${err.message}`);
      }

      console.log(`[OCR] Attempt ${ocrAttempt} — processing ${filepath}, size: ${filesize ?? 'unknown'} bytes`);

      // Prepare form data for OCR.space
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

      // Log only HTTP status and text length to avoid flooding logs
      const parsedResult = ocrres.data?.ParsedResults?.[0];
      const text = parsedResult?.ParsedText || '';
      console.log(`[OCR] HTTP ${ocrres.status} — parsed text length: ${text.length}`);

      // Handle API-level errors
      const apiErrorMsg = ocrres.data?.ErrorMessage;
      const exitCode = ocrres.data?.OCRExitCode;
      if (apiErrorMsg || (exitCode !== undefined && exitCode !== 1)) {
        const errorDetail = Array.isArray(apiErrorMsg) ? apiErrorMsg.join('; ') : (apiErrorMsg || 'unknown error');
        console.error(`[OCR] API error — exit code: ${exitCode}, message: ${errorDetail}`);
        return null;
      }

      // Handle parsing errors
      if (parsedResult?.ErrorMessage) {
        console.error(`[OCR] Parsing error: ${parsedResult.ErrorMessage}`);
        return null;
      }

      if (!text) {
        console.warn(`[OCR] No text extracted — document may be unreadable or low quality`);
      }

      return text;

    } catch (err) {
      console.error(`[OCR] Attempt ${ocrAttempt} failed for ${filepath}: ${err.message}`);
      if (ocrAttempt === 2) return null; // only retry once
    }
  }
};

module.exports = { extractdocumentdata };
