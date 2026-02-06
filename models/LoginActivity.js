const mongoose = require('mongoose');

const loginActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'userModel' },
  userType: { type: String, required: true, enum: ['player', 'institution', 'official', 'admin'] },
  userModel: { type: String, required: true, enum: ['Player', 'Institution', 'TechnicalOfficial', 'Admin'] },
  email: { type: String, lowercase: true, trim: true },
  ip: { type: String },
  forwardedIp: { type: String },
  userAgent: { type: String },
  acceptLanguage: { type: String },
  referer: { type: String },
  path: { type: String },
  method: { type: String },
  host: { type: String },
  loginType: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  country: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('LoginActivity', loginActivitySchema);