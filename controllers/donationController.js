const Donation = require('../models/Donation');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const { sendDonationEmail } = require('../utils/mailer');

// Create a donation entry (supports optional receipt file upload)
exports.createDonation = async (req, res) => {
  try {
    const { name, email, phone, amount, method, message } = req.body;
    if (!name || !amount) {
      return res.status(400).json({ success: false, message: 'Name and amount are required.' });
    }

    let receiptUrl;
    if (req.file) {
      // Upload to cloudinary
      const filePath = path.resolve(req.file.path);
      const upload = await cloudinary.uploader.upload(filePath, { folder: 'ddka/donations' });
      receiptUrl = upload.secure_url;

      // Remove local file for hygiene
      try { fs.unlinkSync(filePath); } catch (err) { /* ignore */ }
    }

    const donation = await Donation.create({
      name,
      email,
      phone,
      amount: Number(amount),
      method: method || 'upi',
      message,
      receiptUrl,
      status: 'pending'
    });

    // Send a donation receipt/acknowledgement email (best-effort)
    try {
      await sendDonationEmail({ to: email, name, amount: Number(amount) });
    } catch (mailErr) {
      console.warn('Donation email send failed:', mailErr.message || mailErr);
    }

    res.json({ success: true, message: 'Donation recorded.', data: donation });
  } catch (err) {
    console.error('createDonation error:', err);
    res.status(500).json({ success: false, message: 'Failed to create donation.', error: err.message });
  }
};

// Admin: list donations
exports.getDonations = async (_req, res) => {
  try {
    const items = await Donation.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch donations.' });
  }
};

// Admin: update status (confirmed, pending, failed)
exports.updateDonationStatus = async (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ success: false, message: 'ID and status required.' });
  try {
    const allowed = ['pending', 'confirmed', 'failed'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const updated = await Donation.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Donation not found.' });

    // If marked confirmed, send an acknowledgement/receipt email (best-effort)
    try {
      if (status === 'confirmed' && updated.email) {
        await sendDonationEmail({ to: updated.email, name: updated.name, amount: updated.amount });
      }
    } catch (mailErr) {
      console.warn('sendDonationEmail on status update failed:', mailErr.message || mailErr);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
};

// Admin: update donation details (txId, receiptNumber, upload receipt image)
exports.updateDonationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Donation ID is required.' });

    const { txId, receiptNumber, notify, phone } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found.' });

    // Handle optional receipt file upload
    if (req.file) {
      try {
        const filePath = req.file.path;
        const upload = await cloudinary.uploader.upload(filePath, { folder: 'ddka/donations' });
        donation.receiptUrl = upload.secure_url;
        try { fs.unlinkSync(filePath); } catch (err) { /* ignore */ }
      } catch (upErr) {
        console.error('Receipt upload failed', upErr);
        return res.status(500).json({ success: false, message: 'Failed to upload receipt image.' });
      }
    }

    if (typeof txId !== 'undefined') donation.txId = txId;
    if (typeof receiptNumber !== 'undefined') donation.receiptNumber = receiptNumber;
    if (typeof phone !== 'undefined') donation.phone = phone;

    const updated = await donation.save();

    // Optional: send notification email if requested
    try {
      if (notify === 'true' && updated.email) {
        await sendDonationEmail({ to: updated.email, name: updated.name, amount: updated.amount });
      }
    } catch (mailErr) {
      console.warn('sendDonationEmail after detail update failed:', mailErr.message || mailErr);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateDonationDetails error:', err);
    res.status(500).json({ success: false, message: 'Failed to update donation details.' });
  }
};

// Admin: send a PDF receipt to donor (expects JSON: { pdfBase64, filename })
exports.sendDonationReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfBase64, filename } = req.body;
    if (!id || !pdfBase64) return res.status(400).json({ success: false, message: 'Donation ID and pdfBase64 are required.' });

    const donation = await Donation.findById(id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found.' });
    if (!donation.email) return res.status(400).json({ success: false, message: 'Donor has no email address.' });

    // Convert base64 string to buffer and attach
    const buffer = Buffer.from(pdfBase64, 'base64');
    try {
      await sendDonationEmail({ to: donation.email, name: donation.name, amount: donation.amount, attachments: [{ filename: filename || `donation-${donation._id}.pdf`, content: buffer }] });
      res.json({ success: true, message: 'Receipt emailed to donor.' });
    } catch (mailErr) {
      console.error('Failed to send receipt email:', mailErr);
      res.status(500).json({ success: false, message: 'Failed to send receipt email.' });
    }
  } catch (err) {
    console.error('sendDonationReceipt error:', err);
    res.status(500).json({ success: false, message: 'Failed to send donation receipt.' });
  }
};

// Public: get donation by id (used for receipt viewing)
exports.getDonationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Donation ID is required.' });

    const donation = await Donation.findById(id).select('-__v');
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found.' });

    // For privacy, avoid returning server-only/internal fields (none extra now), return donation data
    res.json({ success: true, data: donation });
  } catch (err) {
    console.error('getDonationById error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch donation.' });
  }
};
