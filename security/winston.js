const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp("YYYY-MM-DD HH:mm:ss"),
    format.printf((info) => `${info.message} ${info.timestamp} ${info.level}`),
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "app.log", level: "info" }),
  ],
});

module.exports = logger;

