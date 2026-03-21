const prisma = require('../prisma.client');

const BEHAVIOR_WEIGHTS = {
  'Suspicious submission rate from this IP': 10,
  'Too many rapid submissions from same device': 8,
  'Automated bot submission detected': 15,
  'Form submitted too fast — possible automation': 12,
  'Suspicious submission time (night hours)': 5,
  'Same device used for multiple applicants in short time': 10,
  'Same IP used for multiple applicants in short time': 8
};

const checkBehavioralPatterns = async (Ipaddress, devicefingerprint, useragent, timeToSubmit = null) => {
  const flags = [];
  const now = new Date();

  
  const timeFrames = [
    { label: 'lastHour', ms: 60*60*1000, thresholdIP: 5, thresholdDevice: 3 },
    { label: 'lastDay', ms: 24*60*60*1000, thresholdIP: 20, thresholdDevice: 10 },
    { label: 'lastWeek', ms: 7*24*60*60*1000, thresholdIP: 50, thresholdDevice: 25 }
  ];

  for (const tf of timeFrames) {
    const since = new Date(now - tf.ms);

    const recentIPcount = await prisma.Application.count({
      where: { Ipaddress, createdate: { gte: since } }
    });
    if (recentIPcount > tf.thresholdIP) {
      flags.push({ reason: 'Suspicious submission rate from this IP' });
    }

    const recentDevicecount = await prisma.Application.count({
      where: { devicefingerprint, createdate: { gte: since } }
    });
    if (recentDevicecount > tf.thresholdDevice) {
      flags.push({ reason: 'Too many rapid submissions from same device' });
    }
  }

  
  const hour = now.getHours();
  if (hour >= 2 && hour <= 5) {
    flags.push({ reason: 'Suspicious submission time (night hours)' });
  }

  
  const recentDeviceApplicants = await prisma.Application.findMany({
    where: { devicefingerprint, createdate: { gte: new Date(now - 60*60*1000) } },
    select: { nameinput: true },
  });
  const uniqueDeviceApplicants = new Set(recentDeviceApplicants.map(a => a.nameinput));
  if (uniqueDeviceApplicants.size > 3) {
    flags.push({ reason: 'Same device used for multiple applicants in short time' });
  }

  
  const recentIPApplicants = await prisma.Application.findMany({
    where: { Ipaddress, createdate: { gte: new Date(now - 60*60*1000) } },
    select: { nameinput: true } 
  });
  const uniqueIPApplicants = new Set(recentIPApplicants.map(a => a.nameinput));
  if (uniqueIPApplicants.size > 5) {
    flags.push({ reason: 'Same IP used for multiple applicants in short time' });
  }


  const useragentlower = useragent?.toLowerCase() || '';
  const botSignals = ['bot', 'crawler', 'spider', 'curl', 'python', 'axios'];
  if (botSignals.some(b => useragentlower.includes(b))) {
    flags.push({ reason: 'Automated bot submission detected' });
  }

  
  if (timeToSubmit && timeToSubmit < 10000) {
    flags.push({ reason: 'Form submitted too fast — possible automation' });
  }

  return flags;
};

module.exports = { checkBehavioralPatterns, BEHAVIOR_WEIGHTS };