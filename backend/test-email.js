require('dotenv').config();
const emailService = require('./src/features/email/email.service');

(async () => {
  try {
    console.log('Verifying SMTP connection...');
    await emailService.transporter.verify();
    console.log('✅ Email service is correctly configured and working.');
  } catch (error) {
    console.error('❌ Email service failed:', error.message);
  }
})();
