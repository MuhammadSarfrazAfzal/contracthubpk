const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    let transporter;

    // Use SMTP variables if provided
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail', // You can change this to your preferred provider
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      // Fallback: Create a test account using Ethereal email for testing
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const message = {
      from: `${process.env.FROM_NAME || 'ContractHub'} <${process.env.FROM_EMAIL || 'noreply@contracthub.local'}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    const info = await transporter.sendMail(message);

    console.log(`Email sent to ${options.email} with subject: ${options.subject}`);
    
    // If using ethereal testing, print the preview URL
    if (info.messageId && !process.env.EMAIL_USER) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Email could not be sent. Error:', error);
  }
};

module.exports = sendEmail;
