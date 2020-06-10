const nodemailer = require('nodemailer');
const logger = require('../services/logger');

const { EMAIL_USER } = process.env;
const { EMAIL_PASSWORD } = process.env;
const { EMAIL_ADDRESS } = process.env;
const { DO_NOT_SEND_EMAIL } = process.env;

function sendHtmlMail(subject, htmlBody) {
  if (DO_NOT_SEND_EMAIL) {
    return;
  }
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    logger.info('[Email-service] no email user/password, email will not be sent');
    return;
  }
  const html = `<!doctype html>
                <html lang="en">
                  <head>
                    <meta charset="utf-8">
                  </head>
                  <body>
                   ${htmlBody}
                    
                  </body>
                </html>`;

  const mailOptions = {
    from: EMAIL_ADDRESS,
    to: EMAIL_ADDRESS,
    subject,
    html,
  };
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      logger.error(`[Email-service] error sending email: [from: ${mailOptions.from}] [to: ${mailOptions.to}] [subject: ${subject}] - error: ${JSON.stringify(error)}`);
    } else {
      logger.info(`[Email-service] email sent: [from: ${mailOptions.from}] [to: ${mailOptions.to}] [subject: ${subject}]`);
    }
  });
}


module.exports = {
  sendHtmlMail,
};
