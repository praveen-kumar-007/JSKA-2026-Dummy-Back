const Player = require('../models/Player');
const Institution = require('../models/Institution');
const TechnicalOfficial = require('../models/TechnicalOfficial');
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
    const [players, institutions, officials] = await Promise.all([
      Player.find({ email: { $exists: true, $ne: '' } }).select('fullName email status').lean(),
      Institution.find({ email: { $exists: true, $ne: '' } }).select('instName email status').lean(),
      TechnicalOfficial.find({ email: { $exists: true, $ne: '' } }).select('candidateName email status').lean()
    ]);

    const recipients = [
      ...players.map(p => mapRecipient(p, 'Player', 'fullName')),
      ...institutions.map(i => mapRecipient(i, 'Institution', 'instName')),
      ...officials.map(o => mapRecipient(o, 'Technical Official', 'candidateName'))
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
      skippedDuplicates: 0
    };

    const seen = new Set();
    const uniqueRecipients = [];
    for (const r of recipients) {
      const email = String(r.email || '').trim().toLowerCase();
      if (!email) continue;
      if (seen.has(email)) {
        results.skippedDuplicates += 1;
        continue;
      }
      seen.add(email);
      uniqueRecipients.push({ ...r, email });
    }

    for (const r of uniqueRecipients) {
      try {
        if (!r.email) throw new Error('Missing email');
        await sendCustomEmail({ to: r.email, subject, message, name: r.name });
        results.sent += 1;
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
