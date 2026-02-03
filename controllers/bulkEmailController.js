const Player = require('../models/Player');
const Institution = require('../models/Institution');
const TechnicalOfficial = require('../models/TechnicalOfficial');
const NewsletterSubscription = require('../models/NewsletterSubscription');
const ContactMessage = require('../models/ContactMessage');
const { sendCustomEmail } = require('../utils/mailer');

const mapRecipient = (item, type, nameKey) => ({
  id: item._id,
  type,
  name: item[nameKey] || '-',
  email: item.email,
  status: item.status || 'Pending'
});

exports.getBulkRecipients = async (req, res) => {
  try {
    const [players, institutions, officials, newsletters, contacts] = await Promise.all([
      Player.find({ email: { $exists: true, $ne: '' } }).select('fullName email status').lean(),
      Institution.find({ email: { $exists: true, $ne: '' } }).select('instName email status').lean(),
      TechnicalOfficial.find({ email: { $exists: true, $ne: '' } }).select('candidateName email status').lean(),
      NewsletterSubscription.find({ email: { $exists: true, $ne: '' } }).select('email').lean(),
      ContactMessage.find({ email: { $exists: true, $ne: '' } }).select('name email status').lean()
    ]);

    const recipients = [
      ...players.map(p => ({
        ...mapRecipient(p, 'Player', 'fullName'),
        status: p.status || 'Pending'
      })),
      ...institutions.map(i => ({
        ...mapRecipient(i, 'Institution', 'instName'),
        status: i.status || 'Pending'
      })),
      ...officials.map(o => ({
        ...mapRecipient(o, 'Technical Official', 'candidateName'),
        status: o.status || 'Pending'
      })),
      ...newsletters.map(n => ({
        id: n._id,
        type: 'Newsletter',
        name: 'Subscriber',
        email: n.email,
        status: 'Subscribed'
      })),
      ...contacts.map(c => ({
        id: c._id,
        type: 'Contact',
        name: c.name || '-',
        email: c.email,
        status: c.status || 'New'
      }))
    ];

    res.status(200).json({ success: true, data: recipients });
  } catch (err) {
    console.error('getBulkRecipients error', err);
    res.status(500).json({ success: false, message: 'Failed to load recipients' });
  }
};

exports.sendBulkEmail = async (req, res) => {
  try {
    const { subject, message, recipients } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one recipient' });
    }

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      failures: [],
      skipped: 0,
      skippedReasons: []
    };

    for (const r of recipients) {
      try {
        const email = String(r.email || '').trim().toLowerCase();
        if (!email) throw new Error('Missing email');
        const result = await sendCustomEmail({ to: email, subject, message, name: r.name, noGreeting: r.noGreeting });
        if (result && result.skipped) {
          results.skipped += 1;
          results.skippedReasons.push({ email, reason: result.reason || 'disabled' });
        } else {
          results.sent += 1;
        }
      } catch (err) {
        results.failed += 1;
        results.failures.push({ email: r.email, error: err.message || 'Failed' });
      }
    }

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('sendBulkEmail error', err);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};
