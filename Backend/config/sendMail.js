const { createTransport } = require("nodemailer");

const sendmail = async (email, subject, html) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
  });

    await transport.sendMail({
        from: process.env.SMTP_EMAIL,
        to: email,
        subject,
        html
    })
};

module.exports = sendmail;