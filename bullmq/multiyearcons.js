const stringSimilarity = require('string-similarity');
const prisma = require('../prisma.client');

const getExpectedForm = (kcpeyear) => {
  return new Date().getFullYear() - parseInt(kcpeyear);
};

const getAgeFromDOB = (dob) => {
  if (!dob) return null;
  const cleaned = dob.replace(/\./g, '-');
  const date = new Date(cleaned);
  if (isNaN(date)) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
};

const expectedAgeRange = {
  1: { min: 13, max: 17 },
  2: { min: 14, max: 18 },
  3: { min: 15, max: 19 },
  4: { min: 16, max: 20 },
};

const CONFIG = {
  NAME_SIMILARITY_THRESHOLD: 0.7,
  SCHOOL_SIMILARITY_THRESHOLD: 0.5,
  MAX_SCHOOL_CHANGES: 3,
  MAX_HISTORY: 10,
};

const checkMultiYearConsistency = async (
  applicationid,
  nameinput,
  bithcertno,
  Assesmentno,
  currentform,
  schoolname,
  kcpeyear,
  dob
) => {
  const flags = [];


  const normalizeForm = (form) => {
  if (!form) return 0;
  const wordmap = { one: 1, two: 2, three: 3, four: 4 };
  const lower = form.toLowerCase();
  for (const [word, num] of Object.entries(wordmap)) {
    if (lower.includes(word)) return num;
  }

  const match = lower.match(/\d/);
  return match ? parseInt(match[0]) : 0;
};


const normalizeSchool = (name) => {
    return name
      ?.toLowerCase()
      .replace(/\b(secondary|school|high|boys|girls|mixed|national|county)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim() || '';
  };


  
  const currform = normalizeForm(currentform);
  const currschool = normalizeSchool(schoolname);

  
  const allprevious = await prisma.Application.findMany({
    where: {
      bithcertno,
      NOT: { id: applicationid }
    },
    orderBy: { createdate: 'desc' },
    take: CONFIG.MAX_HISTORY,
    select: { currentform: true, schoolname: true, nameinput: true }
  });

  
  const expectedform = getExpectedForm(kcpeyear);
  if (currform !== expectedform) {
    flags.push({
      reason: `Form inconsistent with KCPE year — expected Form ${expectedform} not Form ${currform}`
    });
  }


  const age = getAgeFromDOB(dob);
  if (age && expectedAgeRange[currform]) {
    const { min, max } = expectedAgeRange[currform];
    if (age < min || age > max) {
      flags.push({
        reason: `Age ${age} outside expected range (${min}-${max}) for Form ${currform}`
      });
    }
  }

  if (allprevious.length === 0) return flags;

  const latest = allprevious[0];


  const maxpreviousform = Math.max(...allprevious.map(p => normalizeForm(p.currentform)));
  if (currform <= maxpreviousform) {
    flags.push({
      reason: `Form regression — previously reached Form ${maxpreviousform} now claiming Form ${currform}`
    });
  }

  
  const namesimilarity = stringSimilarity.compareTwoStrings(
    nameinput?.toLowerCase() || '',
    latest.nameinput?.toLowerCase() || ''
  );
  if (namesimilarity < CONFIG.NAME_SIMILARITY_THRESHOLD) {
    flags.push({
      reason: `Name mismatch — "${latest.nameinput}" vs "${nameinput}" (${Math.round(namesimilarity * 100)}% match)`
    });
  }

  
  const prevschool = normalizeSchool(latest.schoolname);
  const schoolsimilarity = stringSimilarity.compareTwoStrings(currschool, prevschool);

  if (schoolsimilarity < CONFIG.SCHOOL_SIMILARITY_THRESHOLD) {
    const uniqueschools = [...new Set(allprevious.map(p => normalizeSchool(p.schoolname)))];
    if (uniqueschools.length >= CONFIG.MAX_SCHOOL_CHANGES) {
      flags.push({
        reason: `School hopping — ${uniqueschools.length} different schools across applications`
      });
    } else {
      flags.push({
        reason: `School changed from "${latest.schoolname}" to "${schoolname}" — flagged for review`
      });
    }
  }


  if (allprevious.length >= 3) {
    const recentforms = allprevious.slice(0, 3).map(p => normalizeForm(p.currentform));
    if (recentforms[0] === recentforms[2] && recentforms[0] !== recentforms[1]) {
      flags.push({ reason: `Alternating form pattern detected — ${recentforms.join(', ')}` });
    }

    const recentschools = allprevious.slice(0, 3).map(p => normalizeSchool(p.schoolname));
    if (recentschools[0] === recentschools[2] && recentschools[0] !== recentschools[1]) {
      flags.push({ reason: `Alternating school pattern detected across recent applications` });
    }
  }

  return flags;
};


module.exports={checkMultiYearConsistency};