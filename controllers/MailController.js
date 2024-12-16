const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: true, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: process.env.SMAIL,
      pass: process.env.MAIL_PASSWORD,
    },
  });