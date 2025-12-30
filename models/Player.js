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
    sportsExperience: { type: String },
    reasonForJoining: { type: String, required: true },
    transactionId: { type: String, required: true, unique: true },
    
    // Cloudinary URLs (Stored as Strings)
    photoUrl: { type: String, required: true },
    aadharFrontUrl: { type: String, required: true },
    aadharBackUrl: { type: String, required: true },
    receiptUrl: { type: String, required: true }, // NEW: For manual verification
    
    status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);