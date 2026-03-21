const {Resend}= require('resend');
require("dotenv").config();

function getresend() {
    return new Resend(process.env.EMAILAPI);
}
module.exports = getresend;