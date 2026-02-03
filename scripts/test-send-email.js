// Quick test script to send a sample approval email using .env credentials
// Usage: npm run test-email   (from the DDKA-back folder)

require('dotenv').config();

const { sendApprovalEmail } = require('../utils/mailer');

(async () => {
  try {
    const to = process.env.TEST_RECIPIENT || process.env.EMAIL_USER;
    if (!to) {
      console.log('Set TEST_RECIPIENT or EMAIL_USER to run the test.');
      process.exitCode = 1;
      return;
    }
    console.log('Sending test approval email to', to);
    await sendApprovalEmail({
      to,
      name: 'DDKA Test',
      idNo: 'TEST-000',
      entityType: 'player',
      loginId: 'test@example.com',
      loginPassword: '9999999999',
    });
    console.log('Test email sent successfully to', to);
    process.exitCode = 0;
  } catch (err) {
    console.error('Test email failed:', err);
    process.exitCode = 1;
  }
})();