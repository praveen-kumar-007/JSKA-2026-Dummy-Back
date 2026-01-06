const ContactMessage = require('../models/ContactMessage');
const NewsletterSubscription = require('../models/NewsletterSubscription');
const verifyRecaptcha = require('../middleware/recaptcha');

// Save a new contact form submission
exports.sendContactForm = async (req, res) => {
  const { name, email, phone, subject, message, botField, recaptchaToken } = req.body;

  // Simple honeypot check: if this hidden field is filled, treat as bot and ignore
  if (botField) {
    return res.status(200).json({ success: true, message: 'Message received.' });
  }
  if (!email || !name || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }
  try {
    // Verify reCAPTCHA (enforced when RECAPTCHA_SECRET_KEY is set)
    const recaptchaOk = await verifyRecaptcha(recaptchaToken, req.ip);
    if (!recaptchaOk) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed.' });
    }

    const doc = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message,
      status: 'New',
    });
    res.json({ success: true, message: 'Message received.', data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save message.', error: err.message });
  }
};

// Admin: get all contact messages
exports.getAllContacts = async (_req, res) => {
  try {
    const items = await ContactMessage.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch contact messages.' });
  }
};

// Admin: update contact status (New, Read, Rejected)
exports.updateContactStatus = async (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ success: false, message: 'ID and status are required.' });
  }
  try {
    const allowed = ['New', 'Read', 'Rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }
    const updated = await ContactMessage.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Contact message not found.' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status.', error: err.message });
  }
};

// Admin: delete a contact message
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ContactMessage.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Contact message not found.' });
    }
    res.json({ success: true, message: 'Contact message deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete message.', error: err.message });
  }
};

// Newsletter subscription: store in DB
exports.subscribeNewsletter = async (req, res) => {
  const { email, botField, recaptchaToken } = req.body;

  // Honeypot for bots
  if (botField) {
    return res.status(200).json({ success: true, message: 'Subscribed successfully.' });
  }
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
  try {
    // Verify reCAPTCHA (enforced when RECAPTCHA_SECRET_KEY is set)
    const recaptchaOk = await verifyRecaptcha(recaptchaToken, req.ip);
    if (!recaptchaOk) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed.' });
    }

    const existing = await NewsletterSubscription.findOne({ email });
    if (existing) {
      return res.json({ success: true, message: 'Already subscribed.' });
    }
    const doc = await NewsletterSubscription.create({ email });
    res.json({ success: true, message: 'Subscribed successfully.', data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to subscribe.', error: err.message });
  }
};

// Admin: get all newsletter subscriptions
exports.getAllNewsletters = async (_req, res) => {
  try {
    const items = await NewsletterSubscription.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch newsletter subscriptions.' });
  }
};

// Admin: delete a newsletter subscription
exports.deleteNewsletter = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await NewsletterSubscription.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Newsletter subscription not found.' });
    }
    res.json({ success: true, message: 'Newsletter subscription deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete newsletter subscription.', error: err.message });
  }
};
