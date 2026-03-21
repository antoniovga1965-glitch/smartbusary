
const { Queue } = require('bullmq');
const reddisconnection = require('./connection');

const verificationQueue = new Queue('verification', {
  connection: reddisconnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    }
  }
});

module.exports = { verificationQueue };