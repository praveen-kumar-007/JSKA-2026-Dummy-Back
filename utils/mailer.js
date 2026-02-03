const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Setting = require('../models/Setting');

const logoUrl = process.env.EMAIL_LOGO_URL;
const logoFooterHtml = logoUrl
  ? `<div style="text-align:center; margin-top:20px;">
      <img src="${logoUrl}" alt="DDKA" style="max-width:140px; height:auto;" />
    </div>`
  : '';

const wrapHtml = (innerHtml) => `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#111; max-width:680px;">
    ${innerHtml}
    ${logoFooterHtml}
  </div>
`;

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Email sending is controlled by the admin toggle (emailEnabled).
// Prefer Brevo API when BREVO_API_KEY is set (works on Render free tier).
// SMTP is used only if Brevo is not configured.

// Uses Gmail SMTP. Recommended: generate an App Password and set EMAIL_USER and EMAIL_PASS in your .env
// By default we use port 587 (STARTTLS) to improve compatibility with hosting providers that often block 465 or 25.
// Example .env entries:
// EMAIL_USER=your.email@gmail.com
// EMAIL_PASS=your_app_password
// EMAIL_PORT=587

let transporter = null;
if (!process.env.BREVO_API_KEY && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
    secure: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) === 465 : false,
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

  // Verify transporter at startup to provide clear diagnostics (opt-in)
  const verifyOnStartup = String(process.env.EMAIL_VERIFY_ON_STARTUP || 'false').toLowerCase() === 'true';
  if (verifyOnStartup) {
    transporter.verify((err) => {
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
  }
} else if (!process.env.BREVO_API_KEY) {
  console.warn('SMTP credentials are missing (EMAIL_USER/EMAIL_PASS). Emails will be skipped until configured.');
}

const isEmailEnabled = async () => {
  try {
    if (mongoose.connection?.readyState !== 1) {
      return true;
    }
    const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
    if (settings && typeof settings.emailEnabled === 'boolean') {
      return settings.emailEnabled;
    }
  } catch (err) {
    console.error('Failed to read emailEnabled setting', err);
  }
  return true;
};

const sendWithFallback = async (mailOptions) => {
  const enabled = await isEmailEnabled();
  if (!enabled) {
    const to = mailOptions?.to || 'unknown';
    console.log(`Skipping email to ${to} because email sending is disabled`);
    return { skipped: true, to, reason: 'disabled' };
  }
  const mail = {
    from: mailOptions.from || process.env.EMAIL_FROM || process.env.EMAIL_USER,
    replyTo: mailOptions.replyTo || process.env.EMAIL_REPLY_TO || undefined,
    ...mailOptions
  };

  if (process.env.BREVO_API_KEY) {
    try {
      const toList = Array.isArray(mail.to) ? mail.to : String(mail.to || '').split(',').map(v => v.trim()).filter(Boolean);
      const payload = {
        sender: {
          email: mail.from,
          name: process.env.EMAIL_FROM_NAME || 'DDKA'
        },
        replyTo: mail.replyTo ? { email: mail.replyTo } : undefined,
        to: toList.map(email => ({ email })),
        subject: mail.subject,
        textContent: mail.text || undefined,
        htmlContent: mail.html || undefined,
        attachment: Array.isArray(mail.attachments)
          ? mail.attachments
              .filter(a => a && (a.content || a.contentBase64) && (a.filename || a.name))
              .map(a => ({
                name: a.filename || a.name,
                content: a.contentBase64 || (Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content)
              }))
          : undefined
      };

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Brevo send failed: ${res.status} ${errText}`);
      }

      return await res.json();
    } catch (err) {
      console.error('Brevo send failed:', err);
      throw err;
    }
  }

  if (!transporter) {
    console.warn('SMTP transporter is not configured; skipping email.');
    return { skipped: true, reason: 'transporter-not-configured' };
  }

  try {
    return await transporter.sendMail(mail);
  } catch (err) {
    console.error('Primary send failed:', err);

    const isAuthError = err && (err.code === 'EAUTH' || (err.message && err.message.toLowerCase().includes('auth')));
    const isConnTimeout = err && (err.code === 'ETIMEDOUT' || (err.message && (err.message.toLowerCase().includes('timeout') || err.message.toLowerCase().includes('connection'))) || err.command === 'CONN');

    if (isAuthError || isConnTimeout) {
      try {
        console.log('Attempting fallback SMTP via port 587 (STARTTLS)...');
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

        await fallback.verify();
        const result = await fallback.sendMail(mail);
        console.log('Fallback send succeeded');
        return result;
      } catch (fallbackErr) {
        console.error('Fallback send also failed:', fallbackErr);
        if (fallbackErr && (fallbackErr.code === 'ETIMEDOUT' || fallbackErr.command === 'CONN')) {
          console.error('Connection timed out when attempting SMTP. Consider using an email API or check host firewall settings.');
        }
        throw fallbackErr;
      }
    }

    throw err;
  }
};

const buildEntityLabel = (entityType) => (entityType === 'institution' ? 'institution' : 'registration');

const sendApprovalEmail = async ({ to, name, idNo, entityType = 'player' } = {}) => {
  if (!to) throw new Error('Recipient email is required');

  if (entityType === 'institution') {
    const subject = '🎉 Institution Approved – Dhanbad District Kabaddi Association';
    const html = wrapHtml(`
        <p>Dear ${name || 'Applicant'},</p>
        <p>Greetings from <strong>Dhanbad District Kabaddi Association</strong>!</p>
        <p>We are pleased to inform you that your institution registration has been <strong>approved</strong>.</p>
        <p>All details and documents submitted by you have been verified and found correct.</p>
        <br />
        <p>With best wishes,<br />
        <strong>Dhanbad District Kabaddi Association</strong><br />
        Official Registration Team</p>
    `);
    const text = `Dear ${name || 'Applicant'},\n\nGreetings from Dhanbad District Kabaddi Association!\n\nWe are pleased to inform you that your institution registration has been approved.\n\nAll details and documents submitted by you have been verified and found correct.\n\nWith best wishes,\nDhanbad District Kabaddi Association\nOfficial Registration Team`;
    return await sendWithFallback({ to, subject, text, html });
  }

  const subject = '🎉 Registration Approved – Dhanbad District Kabaddi Association';
  const html = wrapHtml(`
      <p>Dear ${name || 'Player'},</p>

      <p>Greetings from <strong>Dhanbad District Kabaddi Association</strong>!</p>

      <p>We are pleased to inform you that your registration has been <strong>successfully approved</strong> by the Dhanbad District Kabaddi Association.</p>

      <p>All the details and documents submitted by you have been verified and found correct. You are now officially registered with our association.</p>

      ${idNo ? `<p><strong>Your Player ID:</strong> ${idNo}</p>` : ''}

      <p>Please visit the <strong>DDKA official website</strong> to check your details. You can log in using your <strong>Email ID</strong> and <strong>Password</strong> to access your ID card and other assets from DDKA.</p>

      <p>We wish you great success in your kabaddi journey and hope you achieve your dreams in the sport.</p>

      <br />
      <p>With best wishes,<br />
      <strong>Dhanbad District Kabaddi Association</strong><br />
      Official Registration Team</p>
  `);

  const text = `Dear ${name || 'Player'},\n\n` +
    `Greetings from Dhanbad District Kabaddi Association!\n\n` +
    `We are pleased to inform you that your registration has been successfully approved by the Dhanbad District Kabaddi Association.\n\n` +
    `All the details and documents submitted by you have been verified and found correct. You are now officially registered with our association.\n\n` +
    (idNo ? `Your Player ID: ${idNo}\n\n` : '') +
    `Please visit the DDKA official website to check your details. You can log in using your Email ID and Password to access your ID card and other assets from DDKA.\n\n` +
    `We wish you great success in your kabaddi journey and hope you achieve your dreams in the sport.\n\n` +
    `With best wishes,\nDhanbad District Kabaddi Association\nOfficial Registration Team`;

  return await sendWithFallback({ to, subject, text, html });
};

const sendRejectionEmail = async ({ to, name, entityType = 'player' } = {}) => {
  if (!to) throw new Error('Recipient email is required');
  const label = buildEntityLabel(entityType);
  const subject = `Registration Update – DDKA`;
  const html = wrapHtml(`
      <p>Dear ${name || 'Applicant'},</p>
      <p>Thank you for your ${label} submission to the Dhanbad District Kabaddi Association.</p>
      <p>After review, we regret to inform you that your ${label} has been <strong>rejected</strong>.</p>
      <p>If you believe this was a mistake, please contact us for clarification.</p>
      <br />
      <p>Regards,<br />
      <strong>Dhanbad District Kabaddi Association</strong></p>
  `);
  const text = `Dear ${name || 'Applicant'},\n\nThank you for your ${label} submission to the Dhanbad District Kabaddi Association.\n\nAfter review, we regret to inform you that your ${label} has been rejected.\nIf you believe this was a mistake, please contact us for clarification.\n\nRegards,\nDhanbad District Kabaddi Association`;
  return await sendWithFallback({ to, subject, text, html });
};

const sendDeletionEmail = async ({ to, name, entityType = 'player' } = {}) => {
  if (!to) throw new Error('Recipient email is required');
  const label = buildEntityLabel(entityType);
  const subject = `Record Deleted – DDKA`;
  const html = wrapHtml(`
      <p>Dear ${name || 'Applicant'},</p>
      <p>This is to inform you that your ${label} record has been <strong>deleted</strong> from our system.</p>
      <p>If you believe this was a mistake, please contact us and we will assist you.</p>
      <br />
      <p>Regards,<br />
      <strong>Dhanbad District Kabaddi Association</strong></p>
  `);
  const text = `Dear ${name || 'Applicant'},\n\nThis is to inform you that your ${label} record has been deleted from our system.\n\nIf you believe this was a mistake, please contact us and we will assist you.\n\nRegards,\nDhanbad District Kabaddi Association`;
  return await sendWithFallback({ to, subject, text, html });
};

const sendApplicationReceivedEmail = async ({ to, name, entityType = 'player' } = {}) => {
  if (!to) throw new Error('Recipient email is required');
  const label = buildEntityLabel(entityType);
  const subject = `Application Received – DDKA`;
  const html = wrapHtml(`
      <p>Dear ${name || 'Applicant'},</p>
      <p>We have received your ${label} application.</p>
      <p>Your data and records are <strong>under verification</strong>. After successful verification, you will receive further information from us.</p>
      <br />
      <p>Thank you,<br />
      <strong>Dhanbad District Kabaddi Association</strong></p>
  `);
  const text = `Dear ${name || 'Applicant'},\n\nWe have received your ${label} application.\nYour data and records are under verification. After successful verification, you will receive further information from us.\n\nThank you,\nDhanbad District Kabaddi Association`;
  return await sendWithFallback({ to, subject, text, html });
};

const sendDonationEmail = async ({ to, name, amount, attachments } = {}) => {
  if (!to) throw new Error('Recipient email is required');
  const subject = `Thank you for your donation to DDKA`;
  const html = wrapHtml(`
    <p>Dear ${name || 'Supporter'},</p>
    <p>Thank you for your generous donation of <strong>₹${amount}</strong> to the Dhanbad District Kabaddi Association.</p>
    <p>We will process your contribution and send an official receipt shortly.</p>
    <p>With gratitude,<br/>Dhanbad District Kabaddi Association</p>
  `);
  const text = `Dear ${name || 'Supporter'},\n\nThank you for your generous donation of ₹${amount} to Dhanbad District Kabaddi Association. We will process your contribution and send an official receipt shortly.\n\nWith gratitude,\nDDKA`;

  return await sendWithFallback({ to, subject, text, html, attachments: attachments || [] });
};

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
  sendDeletionEmail,
  sendApplicationReceivedEmail,
  sendDonationEmail,
  sendCustomEmail: async ({ to, subject, message, name, noGreeting } = {}) => {
    if (!to) throw new Error('Recipient email is required');
    if (!subject) throw new Error('Subject is required');
    const safeText = String(message || '').trim();
    const greetingName = (name || '').trim() || 'Sir/Madam';
    const htmlMessage = safeText
      ? safeText.split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('')
      : '<p></p>';
    const htmlBody = noGreeting
      ? `
      ${htmlMessage}
      <p>With regards,<br/>Dhanbad District Kabaddi Association</p>
    `
      : `
      <p>Respected ${escapeHtml(greetingName)},</p>
      ${htmlMessage}
      <p>With regards,<br/>Dhanbad District Kabaddi Association</p>
    `;
    const html = wrapHtml(htmlBody);
    const text = noGreeting
      ? `${safeText || ''}\n\nWith regards,\nDhanbad District Kabaddi Association`
      : `Respected ${greetingName},\n\n${safeText || ''}\n\nWith regards,\nDhanbad District Kabaddi Association`;
    return await sendWithFallback({ to, subject, text, html });
  }
};