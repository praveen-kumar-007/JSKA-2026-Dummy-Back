const mongoose = require('mongoose');


const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
  date: { type: Date, default: Date.now },
  category: { type: String },
  isHighlight: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published'], default: 'published' }
}, { timestamps: true });

module.exports = mongoose.model('News', newsSchema);