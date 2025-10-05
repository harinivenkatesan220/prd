const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendReportEmail(toEmail, reportUrl) {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: 'Your Invoice Readiness Report',
      html: `<p>View your report here: <a href="${reportUrl}">${reportUrl}</a></p>`,
      sandbox: true, 
    });
    console.log('Sandbox email sent to', toEmail);
  } catch (error) {
    console.error('Error sending sandbox email:', error);
    throw error;
  }
}

module.exports = { sendReportEmail };
