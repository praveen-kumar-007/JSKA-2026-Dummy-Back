const mongoose = require('mongoose');

const technicalOfficialSchema = new mongoose.Schema({
  candidateName: { type: String, required: true, trim: true },
  parentName: { type: String, required: true, trim: true },
  dob: { type: Date, required: true },
  address: { type: String, required: true, trim: true },
  aadharNumber: { type: String, required: true, trim: true },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Prefer not to say'] },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'NA'],
    default: 'NA'
  },
  playerLevel: {
    type: String,
    required: true,
    enum: ['District', 'State', 'National', 'Never Played', 'Official']
  },
  work: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  education: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },

  // Payment details (exam fee currently fixed at ₹1000)
  transactionId: { type: String, trim: true },
  examFee: { type: Number, default: 1000 },
  receiptUrl: { type: String },

  signatureUrl: { type: String, required: true },
  photoUrl: { type: String, required: true },
  grade: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: null
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  remarks: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('TechnicalOfficial', technicalOfficialSchema);
