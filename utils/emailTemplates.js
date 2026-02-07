// Central place to manage all email subjects and bodies.
// You can freely edit the text here without touching mailer.js.

const wrapLines = (lines) => lines.filter(Boolean).join('\n');

const LOGIN_URL = 'https://dhanbadkabaddiassociation.tech/login';

const templates = {
  playerApproval: {
    subject: ({ name = 'Player' } = {}) => `Registration Approved – ${name}`,
    html: ({ name = 'Player', loginId, loginPassword } = {}) => `
      <p>Dear ${name},</p>

      <p>Greetings from <strong>Dhanbad District Kabaddi Association</strong>!</p>

      <p>We are pleased to inform you that your registration has been <strong>successfully approved</strong> by the Dhanbad District Kabaddi Association.</p>

      <p>All the details and documents submitted by you have been verified and found correct. You are now officially registered with our association.</p>

      <p>Please visit the <strong>DDKA official website</strong> to check your details and download your ID card.</p>

      <p>You can log in directly here: <a href="${LOGIN_URL}" target="_blank" rel="noreferrer">${LOGIN_URL}</a></p>

      <p><strong>Login details for Player Portal:</strong><br/>
      Login ID: <strong>${loginId || 'your registered email address'}</strong><br/>
      Password: <strong>${loginPassword || 'your registered mobile number (used during registration)'}</strong></p>

      <p>Your Login ID is your registered email address and your password is your registered mobile number.</p>

      <p>You will need to enter these details exactly as registered to access your account and ID card.</p>

      <p>We wish you great success in your kabaddi journey and hope you achieve your dreams in the sport.</p>

      <br />
      <p>With best wishes,<br />
      <strong>Dhanbad District Kabaddi Association</strong><br />
      Official Registration Team</p>
    `,
    text: ({ name = 'Player', loginId, loginPassword } = {}) => wrapLines([
      `Dear ${name},`,
      '',
      'Greetings from Dhanbad District Kabaddi Association!',
      '',
      'We are pleased to inform you that your registration has been successfully approved by the Dhanbad District Kabaddi Association.',
      '',
      'All the details and documents submitted by you have been verified and found correct. You are now officially registered with our association.',
      '',
      'Please visit the DDKA official website to check your details and download your ID card.',
      `Login URL: ${LOGIN_URL}`,
      '',
      'Login details for Player Portal:',
      `Login ID: ${loginId || 'your registered email address'}`,
      `Password: ${loginPassword || 'your registered mobile number (used during registration)'}`,
      '',
      'Your Login ID is your registered email address and your password is your registered mobile number.',
      '',
      'You will need to enter these details exactly as registered to access your account and ID card.',
      '',
      'We wish you great success in your kabaddi journey and hope you achieve your dreams in the sport.',
      '',
      'With best wishes,',
      'Dhanbad District Kabaddi Association',
      'Official Registration Team',
    ]),
  },

  institutionApproval: {
    subject: ({ name = 'Applicant' } = {}) => `Institution Registration Approved – ${name}`,
    html: ({ name = 'Applicant', loginId, loginPassword } = {}) => `
      <p>Dear ${name},</p>
      <p>Greetings from <strong>Dhanbad District Kabaddi Association</strong>!</p>
      <p>We are pleased to inform you that your institution registration has been <strong>approved</strong>.</p>
      <p>All details and documents submitted by you have been verified and found correct.</p>
      <p>You can log in to the <strong>DDKA Institution Portal</strong> to view and manage your institution details.</p>

      <p>You can log in directly here: <a href="${LOGIN_URL}" target="_blank" rel="noreferrer">${LOGIN_URL}</a></p>

      <p><strong>Login details for Institution Portal:</strong><br/>
      Login ID: <strong>${loginId || 'your registered institution email address'}</strong><br/>
      Password: <strong>${loginPassword || 'your registered office / alternate phone number'}</strong></p>

      <p>Your Login ID is the institution email address you registered with and your password is the registered office / alternate phone number.</p>
      <br />
      <p>With best wishes,<br />
      <strong>Dhanbad District Kabaddi Association</strong><br />
      Official Registration Team</p>
    `,
    text: ({ name = 'Applicant', loginId, loginPassword } = {}) => wrapLines([
      `Dear ${name},`,
      '',
      'Greetings from Dhanbad District Kabaddi Association!',
      '',
      'We are pleased to inform you that your institution registration has been approved.',
      '',
      'All details and documents submitted by you have been verified and found correct.',
      '',
      'You can log in to the DDKA Institution Portal to view and manage your institution details.',
      `Login URL: ${LOGIN_URL}`,
      '',
      'Login details for Institution Portal:',
      `Login ID: ${loginId || 'your registered institution email address'}`,
      `Password: ${loginPassword || 'your registered office / alternate phone number'}`,
      '',
      'Your Login ID is the institution email address you registered with and your password is the registered office / alternate phone number.',
      '',
      'With best wishes,',
      'Dhanbad District Kabaddi Association',
      'Official Registration Team',
    ]),
  },

  officialApproval: {
    subject: ({ name = 'Applicant' } = {}) => `Technical Official Registration Approved – ${name}`,
    html: ({ name = 'Applicant', loginId, loginPassword } = {}) => `
      <p>Dear ${name},</p>
      <p>Greetings from <strong>Dhanbad District Kabaddi Association</strong>!</p>
      <p>We are happy to inform you that your <strong>Technical Official registration</strong> has been <strong>approved</strong>.</p>
      <p>Your details and documents have been verified and accepted as per our guidelines.</p>

      <p><strong>Login details for Technical Official Portal:</strong><br/>
      Login ID: <strong>${loginId || 'your registered email address'}</strong><br/>
      Password: <strong>${loginPassword || 'your registered mobile number (used during registration)'}</strong></p>

      <p>Your Login ID is your registered email address and your password is your registered mobile number.</p>

      <p>You will need to enter these details exactly as registered to access your account.</p>

      <p>You can log in directly here: <a href="${LOGIN_URL}" target="_blank" rel="noreferrer">${LOGIN_URL}</a></p>
      <br />
      <p>With best wishes,<br />
      <strong>Dhanbad District Kabaddi Association</strong><br />
      Technical Officials Panel</p>
    `,
    text: ({ name = 'Applicant', loginId, loginPassword } = {}) => wrapLines([
      `Dear ${name},`,
      '',
      'Greetings from Dhanbad District Kabaddi Association!',
      '',
      'We are happy to inform you that your Technical Official registration has been approved.',
      'Your details and documents have been verified and accepted as per our guidelines.',
      '',
      'Login details for Technical Official Portal:',
      `Login ID: ${loginId || 'your registered email address'}`,
      `Password: ${loginPassword || 'your registered mobile number (used during registration)'}`,
      `Login URL: ${LOGIN_URL}`,
      '',
      'Your Login ID is your registered email address and your password is your registered mobile number.',
      '',
      'You will need to enter these details exactly as registered to access your account.',
      '',
      'With best wishes,',
      'Dhanbad District Kabaddi Association',
      'Technical Officials Panel',
    ]),
  },

  genericRejection: {
    subject: ({ name = 'Applicant' } = {}) => `Registration Update – ${name}`,
    html: ({ name = 'Applicant', label = 'registration' } = {}) => `
      <p>Dear ${name},</p>
      <p>Thank you for your ${label} submission to the Dhanbad District Kabaddi Association.</p>
      <p>After review, we regret to inform you that your ${label} has been <strong>rejected</strong>.</p>
      <p>If you believe this was a mistake, please contact us for clarification.</p>
      <br />
      <p>Regards,<br />
      <strong>Dhanbad District Kabaddi Association</strong></p>
    `,
    text: ({ name = 'Applicant', label = 'registration' } = {}) => wrapLines([
      `Dear ${name},`,
      '',
      `Thank you for your ${label} submission to the Dhanbad District Kabaddi Association.`,
      '',
      `After review, we regret to inform you that your ${label} has been rejected.`,
      'If you believe this was a mistake, please contact us for clarification.',
      '',
      'Regards,',
      'Dhanbad District Kabaddi Association',
    ]),
  },

  genericDeletion: {
    subject: ({ name = 'Applicant' } = {}) => `Record Deleted – ${name}`,
    html: ({ name = 'Applicant', label = 'registration' } = {}) => `
      <p>Dear ${name},</p>
      <p>This is to inform you that your ${label} record has been <strong>deleted</strong> from our system.</p>
      <p>If you believe this was a mistake, please contact us and we will assist you.</p>
      <br />
      <p>Regards,<br />
      <strong>Dhanbad District Kabaddi Association</strong></p>
    `,
    text: ({ name = 'Applicant', label = 'registration' } = {}) => wrapLines([
      `Dear ${name},`,
      '',
      `This is to inform you that your ${label} record has been deleted from our system.`,
      '',
      'If you believe this was a mistake, please contact us and we will assist you.',
      '',
      'Regards,',
      'Dhanbad District Kabaddi Association',
    ]),
  },

  applicationReceived: {
    subject: ({ name = 'Applicant' } = {}) => `Application Received – ${name}`,
    html: ({ name = 'Applicant', label = 'registration' } = {}) => `
      <p>Dear ${name},</p>
      <p>We have received your ${label} application.</p>
      <p>Your data and records are <strong>under verification</strong>. After successful verification, you will receive further information from us.</p>
      <br />
      <p>Thank you,<br />
      <strong>Dhanbad District Kabaddi Association</strong></p>
    `,
    text: ({ name = 'Applicant', label = 'registration' } = {}) => wrapLines([
      `Dear ${name},`,
      '',
      `We have received your ${label} application.`,
      'Your data and records are under verification. After successful verification, you will receive further information from us.',
      '',
      'Thank you,',
      'Dhanbad District Kabaddi Association',
    ]),
  },

  donationThanks: {
    subject: ({ name = 'Supporter' } = {}) => `Thank you for your donation, ${name}`,
    html: ({ name = 'Supporter', amount } = {}) => `
      <p>Dear ${name},</p>
      <p>Thank you for your generous donation of <strong>₹${amount}</strong> to the Dhanbad District Kabaddi Association.</p>
      <p>We will process your contribution and send an official receipt shortly.</p>
      <p>With gratitude,<br/>Dhanbad District Kabaddi Association</p>
    `,
    text: ({ name = 'Supporter', amount } = {}) => wrapLines([
      `Dear ${name},`,
      '',
      `Thank you for your generous donation of ₹${amount} to Dhanbad District Kabaddi Association. We will process your contribution and send an official receipt shortly.`,
      '',
      'With gratitude,',
      'DDKA',
    ]),
  },

  donationVerification: {
    subject: ({ name = 'Supporter' } = {}) => `Donation Received – Under Verification, ${name}`,
    html: ({ name = 'Supporter', amount } = {}) => `
      <p>Dear ${name},</p>
      <p>Thank you for choosing to support the Dhanbad District Kabaddi Association.</p>
      <p>We have received your donation of <strong>₹${amount}</strong> and it is currently <strong>under verification</strong>.</p>
      <p>Our team will confirm the payment shortly and send you an approval email with your official receipt and download instructions.</p>
      <p>Until then, feel free to reply to this email if you want us to update your contact details or share the transaction reference again.</p>
      <p>With gratitude,<br/>Dhanbad District Kabaddi Association</p>
    `,
    text: ({ name = 'Supporter', amount } = {}) => wrapLines([
      `Dear ${name},`,
      '',
      'Thank you for choosing to support the Dhanbad District Kabaddi Association.',
      `We have received your donation of ₹${amount} and it is currently under verification.`,
      'Our team will confirm the payment shortly and send you an approval email with your official receipt and download instructions.',
      '',
      'If you need to update your contact details or resend the transaction reference, reply to this message and we will assist you.',
      '',
      'With gratitude,',
      'Dhanbad District Kabaddi Association',
    ]),
  },

  donationApproval: {
    subject: ({ name = 'Supporter' } = {}) => `Donation Approved – ${name}`,
    html: ({ name = 'Supporter', amount, downloadEmail, downloadPhone } = {}) => `
      <p>Dear ${name},</p>
      <p>Your donation of <strong>₹${amount}</strong> to the Dhanbad District Kabaddi Association has been officially <strong>approved</strong>.</p>
      <p>You can download your official receipt anytime by visiting <a href="https://dhanbadkabaddiassociation.tech/login" target="_blank" rel="noreferrer">https://dhanbadkabaddiassociation.tech/login</a>, selecting <strong>Donor / Receipt</strong> from the dropdown menu, and entering the registered email and phone number shown below.</p>
      <ul>
        <li><strong>Email:</strong> ${downloadEmail || 'the email you registered with'}</li>
        <li><strong>Phone:</strong> ${downloadPhone || 'the mobile number you registered with'}</li>
      </ul>
      <p>If you need help accessing the receipt, reply to this email or contact us on the same email address and phone number above.</p>
      <p>With gratitude,<br/>Dhanbad District Kabaddi Association</p>
    `,
    text: ({ name = 'Supporter', amount, downloadEmail, downloadPhone } = {}) => wrapLines([
      `Dear ${name},`,
      '',
      `Your donation of ₹${amount} to Dhanbad District Kabaddi Association has been officially approved.`,
      'You can download your official receipt by visiting https://dhanbadkabaddiassociation.tech/login, selecting Donor / Receipt from the dropdown, and entering the email and phone number you used during the donation.',
      '',
      `Email: ${downloadEmail || 'the email you registered with'}`,
      `Phone: ${downloadPhone || 'the mobile number you registered with'}`,
      '',
      'If you need help accessing the receipt, reply to this email or contact us using the same email and phone number above.',
      '',
      'With gratitude,',
      'Dhanbad District Kabaddi Association',
    ]),
  },
};

module.exports = {
  templates,
};
