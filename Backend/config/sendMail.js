const { createTransport } = require("nodemailer");

const sendmail = async (email, subject, html) => {
  const transport = createTransport({
    host: "smpt.gmail.com",
    port: 465,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
  });

    await transport.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject,
        html
    })
};

module.exports = sendmail;