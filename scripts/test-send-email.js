// Quick test script to send a sample approval email using .env credentials
// Usage: npm run test-email   (from the DDKA-back folder)

require('dotenv').config();
const { sendApprovalEmail } = require('../utils/mailer');

(async () => {
  try {
    const to = process.env.TEST_RECIPIENT || process.env.EMAIL_USER;
    console.log('Sending test approval email to', to);
    await sendApprovalEmail({ to, name: 'DDKA Test', idNo: 'TEST-000' });
    console.log('Test email sent successfully to', to);
    process.exit(0);
  } catch (err) {
    console.error('Test email failed:', err);
    process.exit(1);
  }
})();