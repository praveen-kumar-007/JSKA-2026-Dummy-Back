const nodemailer = require('nodemailer');

// Uses Gmail SMTP. Recommended: generate an App Password and set EMAIL_USER and EMAIL_PASS in your .env
// Example .env entries:
// EMAIL_USER=your.email@gmail.com
// EMAIL_PASS=your_app_password

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 465,
  secure: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) === 465 : true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Helpful logging for deployments and diagnostics
  logger: true,
  debug: true,
  // Adjustable timeouts (milliseconds) to reduce false ETIMEDOUT errors on some hosts
  connectionTimeout: process.env.EMAIL_CONNECTION_TIMEOUT ? Number(process.env.EMAIL_CONNECTION_TIMEOUT) : 20000,
  greetingTimeout: process.env.EMAIL_GREETING_TIMEOUT ? Number(process.env.EMAIL_GREETING_TIMEOUT) : 20000,
  socketTimeout: process.env.EMAIL_SOCKET_TIMEOUT ? Number(process.env.EMAIL_SOCKET_TIMEOUT) : 20000,
  tls: {
    // Allow self-signed certs in case hosting blocks proper certificates (mostly harmless for Gmail)
    rejectUnauthorized: false
  }
});

// Verify transporter at startup to provide clear diagnostics
transporter.verify((err, success) => {
  const userSet = !!process.env.EMAIL_USER;
  const passSet = !!process.env.EMAIL_PASS;
  const passLength = process.env.EMAIL_PASS ? String(process.env.EMAIL_PASS).length : 0;

  if (err) {
    console.error('SMTP transporter verification failed:', err);
    console.error(`SMTP debug — userSet: ${userSet}, passSet: ${passSet}, passLength: ${passLength}`);
  } else {
    console.log('SMTP transporter verified. Ready to send emails.');
  }
});

const sendApprovalEmail = async ({ to, name, idNo }) => {
  if (!to) throw new Error('Recipient email is required');

  // Basic diagnostics to help with auth failures (masked values)
  console.log('Preparing approval email. SMTP user set?', !!process.env.EMAIL_USER, 'SMTP pass set?', !!process.env.EMAIL_PASS);

  const subject = '🎉 Registration Approved – Dhanbad District Kabaddi Association';
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.5; color:#111; max-width:680px;">
      <p>Dear ${name || 'Player'},</p>

      <p>Greetings from <strong>Dhanbad District Kabaddi Association</strong>!</p>

      <p>We are pleased to inform you that your registration has been <strong>successfully approved</strong> by the Dhanbad District Kabaddi Association.</p>

      <p>All the details and documents submitted by you have been verified and found correct. You are now officially registered with our association.</p>

      ${idNo ? `<p><strong>Your Player ID:</strong> ${idNo}</p>` : ''}

      <p>You will receive your ID card within <strong>1 month</strong> via mail.</p>

      <p>We wish you great success in your kabaddi journey and hope you achieve your dreams in the sport.</p>

      <br />
      <p>With best wishes,<br />
      <strong>Dhanbad District Kabaddi Association</strong><br />
      Official Registration Team</p>
    </div>
  `;

  const text = `Dear ${name || 'Player'},\n\n` +
    `Greetings from Dhanbad District Kabaddi Association!\n\n` +
    `We are pleased to inform you that your registration has been successfully approved by the Dhanbad District Kabaddi Association.\n\n` +
    `All the details and documents submitted by you have been verified and found correct. You are now officially registered with our association.\n\n` +
    (idNo ? `Your Player ID: ${idNo}\n\n` : '') +
    `You will receive your ID card within 1 month via mail.\n\n` +
    `We wish you great success in your kabaddi journey and hope you achieve your dreams in the sport.\n\n` +
    `With best wishes,\nDhanbad District Kabaddi Association\nOfficial Registration Team`;

  // First attempt: primary transporter
  try {
    return await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error('Primary send failed:', err);

    // If auth failed OR a connection timeout occurred, try a fallback on port 587 (STARTTLS)
    const isAuthError = err && (err.code === 'EAUTH' || (err.message && err.message.toLowerCase().includes('auth')));
    const isConnTimeout = err && (err.code === 'ETIMEDOUT' || (err.message && (err.message.toLowerCase().includes('timeout') || err.message.toLowerCase().includes('connection'))) || err.command === 'CONN');

    if (isAuthError || isConnTimeout) {
      try {
        console.log('Attempting fallback SMTP via port 587 (STARTTLS)... This may help if port 465 is blocked by your host; if this fails, consider using a transactional email provider (SendGrid, Mailgun, Postmark) or an API-based client.');
        const fallback = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          logger: true,
          debug: true,
          connectionTimeout: process.env.EMAIL_CONNECTION_TIMEOUT ? Number(process.env.EMAIL_CONNECTION_TIMEOUT) : 20000,
          greetingTimeout: process.env.EMAIL_GREETING_TIMEOUT ? Number(process.env.EMAIL_GREETING_TIMEOUT) : 20000,
          socketTimeout: process.env.EMAIL_SOCKET_TIMEOUT ? Number(process.env.EMAIL_SOCKET_TIMEOUT) : 20000,
          tls: { rejectUnauthorized: false }
        });

        // verify fallback
        await fallback.verify();
        const result = await fallback.sendMail({ from: process.env.EMAIL_USER, to, subject, text, html });
        console.log('Fallback send succeeded');
        return result;
      } catch (fallbackErr) {
        console.error('Fallback send also failed:', fallbackErr);
        // If this was a connection timeout, add a note to logs about possible host firewall
        if (fallbackErr && (fallbackErr.code === 'ETIMEDOUT' || fallbackErr.command === 'CONN')) {
          console.error('Connection timed out when attempting SMTP. Many hosts (including some PaaS providers) block outbound SMTP ports — consider using an email API or provider (SendGrid, Mailgun) or check your host firewall settings.');
        }
        throw fallbackErr;
      }
    }

    // Otherwise throw original error
    throw err;
  }
};

module.exports = { sendApprovalEmail };