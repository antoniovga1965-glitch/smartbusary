const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const FormData = require('form-data');
require('dotenv').config();
const logger = require('../security/winston');

const checkKRA = async (pin, guardianname, maxRetries = 5) => {
  const flags = [];

  try {
    
    const session = await axios.get(
      'https://itax.kra.go.ke/KRA-Portal/pinChecker.htm',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        },
        timeout: 60000
      }
    );

    const allcookies = session.headers['set-cookie']
      ?.map(c => c.split(';')[0])
      .join('; ');

    if (!allcookies) throw new Error('Failed to get KRA session cookies');

    
    const $ = cheerio.load(session.data);
    const captchasrc = $('img[name="captcha_img"]').attr('src');
    if (!captchasrc) throw new Error('Failed to find CAPTCHA image');

    const captchaRes = await axios.get(
      `https://itax.kra.go.ke${captchasrc}`,
      {
        headers: {
          'Cookie': allcookies,
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        },
        responseType: 'arraybuffer',
        timeout: 10000
      }
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Attempt ${attempt}...`);

      
      const processed = await sharp(Buffer.from(captchaRes.data))
        .resize({ width: 400 })
        .grayscale()
        .normalize()
        .threshold(150)
        .toBuffer();

     
      const form = new FormData();
      form.append('file', processed, { filename: 'captcha.png', contentType: 'image/png' });
      form.append('language', 'eng');
      form.append('isOverlayRequired', 'false');
      form.append('filetype', 'PNG');
      form.append('detectOrientation', 'false');
      form.append('scale', 'true');
      form.append('OCREngine', '2');

      const ocrRes = await axios.post(
        'https://api.ocr.space/parse/image',
        form,
        {
          headers: {
            ...form.getHeaders(),
            'apikey': process.env.OCRAPIKEY,
          },
          timeout: 15000
        }
      );

      const text = ocrRes.data?.ParsedResults?.[0]?.ParsedText?.trim();
      console.log(`OCR.space result: "${text}"`);

      if (!text) {
        console.log('Empty result, retrying...');
        continue;
      }

      const cleaned = text.replace(/\s/g, '').replace(/[?=]/g, '').trim();
      const match = cleaned.match(/(\d+)([+\-*])(\d+)/);

      if (!match) {
        console.log(`Could not parse expression: "${text}", retrying...`);
        continue;
      }

      const answer = String(eval(`${match[1]}${match[2]}${match[3]}`));
      console.log(`Expression: ${match[1]}${match[2]}${match[3]} = ${answer}`);

      
      const res = await axios.post(
        'https://itax.kra.go.ke/KRA-Portal/pinChecker.htm',
        new URLSearchParams({
          viewType: '',
          actionCode: 'checkPin',
          'vo.pinNo': pin,
          captcahText: answer
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': allcookies,
            'Referer': 'https://itax.kra.go.ke/KRA-Portal/pinChecker.htm',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          },
          timeout: 15000
        }
      );

      
      if (res.data.includes('arithmetic')) {
        console.log('Wrong captcha answer, retrying...');
        continue;
      }

    
      const $2 = cheerio.load(res.data);
      const cells = [];
      $2('td').each((i, el) => {
        const t = $2(el).text().trim();
        if (t && t.length < 100) cells.push(t);
      });

      const pinIdx = cells.indexOf('PIN Details');
      if (pinIdx === -1) {
        console.log('PIN Details not found, retrying...');
        continue;
      }

      const taxpayername = cells[pinIdx + 4];
      const pinstatus = cells[pinIdx + 6];
      const station = cells[pinIdx + 10];

      console.log(`KRA Result → Name: ${taxpayername} | Status: ${pinstatus} | Station: ${station}`);

   
      if (pinstatus?.toLowerCase() !== 'active') {
        flags.push({ reason: `KRA PIN is not active — status: ${pinstatus}` });
      }

      const returnedname = taxpayername?.toLowerCase() || '';
      const enteredname = guardianname?.toLowerCase() || '';
      const firstname = enteredname.split(' ')[0];

      if (!returnedname.includes(firstname)) {
        flags.push({ reason: 'Guardian name does not match KRA records' });
      }

      logger.info(`KRA verified — ${taxpayername} — ${pinstatus}`);
      return { flags, taxpayername, pinstatus, station };
    }

    throw new Error('Max retries reached — could not solve CAPTCHA');

  } catch (error) {
    console.error('KRA check error:', error.message);
    throw new Error(`KRA verification failed: ${error.message}`);
  }
};



module.exports = {checkKRA};