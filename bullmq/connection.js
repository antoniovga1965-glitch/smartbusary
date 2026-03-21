// const reddisconnection = {
//   port:6379,
//   host:'localhost',
// };
// module.exports = reddisconnection;

const reddisconnection = {
  port: process.env.REDISPORT || 6379,
  host: process.env.REDISHOST || 'localhost',
  password: process.env.REDISPASSWORD || undefined,
  username: process.env.REDISUSER || 'default',
};

module.exports = reddisconnection;