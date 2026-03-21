const { PDFDocument } = require("pdf-lib");
const fs = require('fs');
const path = require('path')

const pdfcheck = async (files) => {
  const flags = [];

  for(const fieldname of Object.keys(files)){

    const file = files[fieldname][0];

   if (file.mimetype !== "application/pdf") continue;



  try {
    const buffer =fs.readFileSync(file.path);
    if (!buffer.slice(0, 4).toString().includes("%PDF")) {
    flags.push("Not a real pdf file");

  }

  const pdfsize = buffer.length / 1024;
  if (pdfsize < 10) {
    flags.push("too small to be a pdf");
  } else if (pdfsize > 5000) {
    flags.push("Too large to be a pdf");
  }


    const pdfdoc=await PDFDocument.load(buffer,{ignoreEncryption:true});

    if (pdfdoc.getPageCount() > 2) {
      flags.push("To suspicous to be a  KRA pdf file");
    }

  } catch (error) { 
    flags.push('Corrupted files or unreachable pdf')
  }
  }
return flags;
  
};

module.exports = pdfcheck;
