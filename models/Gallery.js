const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gallery', gallerySchema);
