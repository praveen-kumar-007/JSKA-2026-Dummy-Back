const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['upi', 'bank', 'card'], default: 'upi' },
  txId: { type: String },
  receiptNumber: { type: String },
  message: { type: String },
  receiptUrl: { type: String },
  status: { type: String, enum: ['pending','confirmed','failed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Donation', DonationSchema);
