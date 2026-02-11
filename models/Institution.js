const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  instName: { type: String, required: true },
  instType: { type: String, enum: ['School', 'College', 'Club', 'Academy', 'Other'], default: 'Other' },
  regNo: { type: String, index: true },
  email: { type: String },
  officePhone: { type: String },
  address: { type: String },
  contactPerson: { type: String },
  instLogoUrl: { type: String },
  screenshotUrl: { type: String },
  transactionId: { type: String },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] }
}, { timestamps: true });

module.exports = mongoose.model('Institution', institutionSchema);
