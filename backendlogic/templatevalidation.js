const sharp = require("sharp");

const documentratio = {
  birthcertificate: {
    ratios: [1.414, 0.707],
    tolerance: 0.2,
    minSize: 100000,
    minWidth: 600,
    minHeight: 400,
  },
  admissionletter: {
    ratios: [1.414, 0.707],
    tolerance: 0.2,
    minSize: 100000,
    minWidth: 600,
    minHeight: 400,
  },
  feestructure: {
    ratios: [1.414, 0.707],
    tolerance: 0.2,
    minSize: 100000,
    minWidth: 600,
    minHeight: 400,
  },
  schoolreport: {
    ratios: [1.414, 0.707],
    tolerance: 0.2,
    minSize: 100000,
    minWidth: 600,
    minHeight: 400,
  },
  guardiannationalid: {
    ratios: [1.585, 0.631],
    tolerance: 0.2,
    minSize: 50000,
    minWidth: 400,
    minHeight: 250,
  },
  guardiankra: {
    ratios: [1.414, 0.707],
    tolerance: 0.2,
    minSize: 100000,
    minWidth: 600,
    minHeight: 400,
  },
  proofofincome: {
    ratios: [1.414, 0.707],
    tolerance: 0.2,
    minSize: 100000,
    minWidth: 600,
    minHeight: 400,
  },
  disabilitycertificates: {
    ratios: [1.414, 0.707],
    tolerance: 0.2,
    minSize: 100000,
    minWidth: 600,
    minHeight: 400,
  },
  chiefsletter: {
    ratios: [1.414, 0.707],
    tolerance: 0.2,
    minSize: 100000,
    minWidth: 600,
    minHeight: 400,
  },
  passportphoto: {
    ratios: [1.0, 0.75, 1.33],
    tolerance: 0.2,
    minSize: 20000,
    minWidth: 200,
    minHeight: 200,
  },
};

const temmplateresults = async (files) => {
  const flags = [];

  for (const fieldname of Object.keys(files)) {
    const file = files[fieldname][0];
    if (!file) continue;

    const specification = documentratio[fieldname];
    if (!specification) continue; 

    try {
      const metadata = await sharp(file.path).metadata();
      const { width, height } = metadata;

      if (!width || !height) {
        flags.push({ field: fieldname, reason: `Could not read dimensions of ${fieldname}` });
        continue;
      }

    
      const meetsMinWidth = width >= specification.minWidth;
      const meetsMinHeight = height >= specification.minHeight;

      if (!meetsMinWidth || !meetsMinHeight) {
        flags.push({ field: fieldname, reason: `${fieldname} image is too small — may be a screenshot or thumbnail` });
        continue;
      }

    
      const rawRatio = width / height;
      const normalizedRatio = rawRatio < 1 ? 1 / rawRatio : rawRatio;

      
      const ratioValid = specification.ratios.some(expected => {
        const normalizedExpected = expected < 1 ? 1 / expected : expected;
        return Math.abs(normalizedRatio - normalizedExpected) <= specification.tolerance;
      });

      if (!ratioValid) {
        flags.push({ field: fieldname, reason: `${fieldname} dimensions look suspicious — expected document format not matched` });
      }

    } catch (error) {
      console.error(`Template validation error for ${fieldname}:`, error.message);
      flags.push({ field: fieldname, reason: `Could not process ${fieldname} — file may be corrupted` });
    }
  }

  return flags;
};

module.exports = temmplateresults;