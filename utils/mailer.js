const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const { templates } = require('./emailTemplates');

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

const buildEntityLabel = (entityType) => {
  if (entityType === 'institution') return 'institution registration';
  if (entityType === 'official') return 'Technical Official registration';
  return 'player registration';
};

const sendApprovalEmail = async ({ to, name, idNo, entityType = 'player' } = {}) => {
  if (!to) throw new Error('Recipient email is required');

  if (entityType === 'institution') {
    const tpl = templates.institutionApproval;
    const ctx = { name: name || 'Applicant' };
    const subject = typeof tpl.subject === 'function' ? tpl.subject(ctx) : tpl.subject;
    const html = wrapHtml(tpl.html(ctx));
    const text = tpl.text(ctx);
    return await sendWithFallback({ to, subject, text, html });
  }

  if (entityType === 'official') {
    const tpl = templates.officialApproval;
    const ctx = { name: name || 'Applicant' };
    const subject = typeof tpl.subject === 'function' ? tpl.subject(ctx) : tpl.subject;
    const html = wrapHtml(tpl.html(ctx));
    const text = tpl.text(ctx);
    return await sendWithFallback({ to, subject, text, html });
  }

  const tpl = templates.playerApproval;
  const ctx = { name: name || 'Player' };
  const subject = typeof tpl.subject === 'function' ? tpl.subject(ctx) : tpl.subject;
  const html = wrapHtml(tpl.html(ctx));
  const text = tpl.text(ctx);
  return await sendWithFallback({ to, subject, text, html });
};

const sendRejectionEmail = async ({ to, name, entityType = 'player' } = {}) => {
  if (!to) throw new Error('Recipient email is required');
  const label = buildEntityLabel(entityType);
  const tpl = templates.genericRejection;
  const ctx = { name: name || 'Applicant', label };
  const subject = typeof tpl.subject === 'function' ? tpl.subject(ctx) : tpl.subject;
  const html = wrapHtml(tpl.html(ctx));
  const text = tpl.text(ctx);
  return await sendWithFallback({ to, subject, text, html });
};

const sendDeletionEmail = async ({ to, name, entityType = 'player' } = {}) => {
  if (!to) throw new Error('Recipient email is required');
  const label = buildEntityLabel(entityType);
  const tpl = templates.genericDeletion;
  const ctx = { name: name || 'Applicant', label };
  const subject = typeof tpl.subject === 'function' ? tpl.subject(ctx) : tpl.subject;
  const html = wrapHtml(tpl.html(ctx));
  const text = tpl.text(ctx);
  return await sendWithFallback({ to, subject, text, html });
};

const sendApplicationReceivedEmail = async ({ to, name, entityType = 'player' } = {}) => {
  if (!to) throw new Error('Recipient email is required');
  const label = buildEntityLabel(entityType);
  const tpl = templates.applicationReceived;
  const ctx = { name: name || 'Applicant', label };
  const subject = typeof tpl.subject === 'function' ? tpl.subject(ctx) : tpl.subject;
  const html = wrapHtml(tpl.html(ctx));
  const text = tpl.text(ctx);
  return await sendWithFallback({ to, subject, text, html });
};

const sendDonationEmail = async ({ to, name, amount, attachments } = {}) => {
  if (!to) throw new Error('Recipient email is required');
  const tpl = templates.donationThanks;
  const ctx = { name: name || 'Supporter', amount };
  const subject = typeof tpl.subject === 'function' ? tpl.subject(ctx) : tpl.subject;
  const html = wrapHtml(tpl.html(ctx));
  const text = tpl.text(ctx);
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