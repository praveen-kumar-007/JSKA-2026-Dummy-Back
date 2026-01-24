const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const { createDonation, getDonations, updateDonationStatus, updateDonationDetails, sendDonationReceipt, getDonationById } = require('../controllers/donationController');
const { protect, requirePermission } = require('../middleware/authMiddleware');

// Public: create donation (accepts optional receipt image)
router.post('/', upload.single('receipt'), createDonation);

// Admin: list donations
router.get('/', protect, requirePermission('canAccessDonations'), getDonations);

// Admin: update status
router.patch('/status', protect, requirePermission('canAccessDonations'), updateDonationStatus);

// Admin: update details (txId, receiptNumber, upload receipt image)
router.patch('/:id', protect, requirePermission('canAccessDonations'), upload.single('receipt'), updateDonationDetails);

// Admin: send PDF receipt to donor (body: { pdfBase64, filename })
router.post('/:id/send-receipt', protect, requirePermission('canAccessDonations'), express.json({ limit: '10mb' }), sendDonationReceipt);

// Public: get a donation by id (for receipt viewing)
router.get('/:id', getDonationById);

// Admin: delete donation (requires delete permission)
router.delete('/:id', protect, requirePermission('canDelete'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await require('../models/Donation').findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Donation not found.' });
    res.json({ success: true, message: 'Donation deleted.' });
  } catch (err) {
    console.error('Failed to delete donation', err);
    res.status(500).json({ success: false, message: 'Failed to delete donation.' });
  }
});

module.exports = router;
