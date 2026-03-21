const FLAGWEIGHTS = {
  
  'KRA pin already used in other applications': 20,
  'Birth certificate number already used somewhere else': 20,
  'ID already used in another application': 20,
  'Duplicate documents detected': 20,

  
  'Student name doesn\'t match government records': 15,
  'Assessment number not found in government database': 15,
  'Guardian name does not match KRA records': 15,
  'KRA PIN is not active': 15,
  'Gender does not match government records': 15,

  
  'County of residence doesn\'t match government database': 10,
  'School doesn\'t match GOK selections': 10,
  'Guardian ID number does not match uploaded National ID': 10,
  'Birth certificate number does not match uploaded certificate': 10,
  'Guardian name does not match National ID': 10,

  
  'Chiefs letter missing official keywords': 5,
  'Location in chiefs letter does not match declared residence': 5,
  'School name does not match admission letter': 5,
  'Student name not found in school report': 5,
  'Proof of income missing key financial keywords': 5,
  'More than 50 applications coming from this IP': 5,
  'Too many applications from this device': 5,

  
  'Form inconsistent with KCPE year': 3,
  'Could not reach ministry of education database': 3,
  'KRA verification incomplete': 3,
};

const AUTO_REJECT = [
  'Birth certificate number already used',
  'ID already used',
  'Duplicate documents detected'
];

const culcateFraudscore = (flags) => {
  let score = 0;
  for (const flag of flags) {
    const autoreject = AUTO_REJECT.some(r => flag.reason.toLowerCase().includes(r.toLowerCase()));
    if (autoreject) return 99;
    const match = Object.entries(FLAGWEIGHTS).find(([key]) =>
      flag.reason.toLowerCase().includes(key.toLowerCase())
    );
    score += match ? match[1] : 5;
  }
  return Math.min(score, 99); 
};

const getstatus = (score)=>{
    if(score===99){
        return "rejected"
    }else if(score<=30){
        return "verified";
    }
    else if (score<=60){
        return  "Manual review";
    }
    return "rejected"
}

module.exports ={culcateFraudscore,getstatus};