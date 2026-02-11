const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    fathersName: { type: String, required: true },
    gender: { type: String, required: true, enum: ['Male', 'Female'] },
    dob: { type: Date, required: true }, // Proper Date type
    bloodGroup: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    parentsPhone: { type: String, required: true },
    address: { type: String, required: true },
    aadharNumber: { type: String, required: true },
    district: { type: String, required: true },
    sportsExperience: { type: String },
    reasonForJoining: { type: String, required: true },
    acceptedTerms: { type: Boolean, required: true, default: false },
    transactionId: { type: String },
    // Cloudinary URLs (Stored as Strings)
    photoUrl: { type: String, required: true },
    aadharFrontUrl: { type: String, required: true },
    aadharBackUrl: { type: String, required: true },
    receiptUrl: { type: String }, // Optional payment proof (may be omitted)
    // Stored membership / ID card number (e.g. DDKA-1234)
    // Not marked unique to avoid hard failures on rare collisions
    idNo: { type: String, index: true },
    // Role printed on ID card (Player, Coach, etc.)
    memberRole: { type: String, default: 'Player' },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);