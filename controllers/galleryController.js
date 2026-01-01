const Gallery = require('../models/Gallery');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Upload images
exports.uploadImages = async (req, res) => {
  try {
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'ddka_gallery' });
        images.push({ url: result.secure_url, public_id: result.public_id });
        fs.unlinkSync(file.path);
      }
    }
    const docs = await Gallery.insertMany(images);
    res.status(201).json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error uploading images', error: error.message });
  }
};

// Get all images
exports.getAllImages = async (req, res) => {
  try {
    const images = await Gallery.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching images' });
  }
};

// Delete image (DB only, Cloudinary handled manually)
exports.deleteImage = async (req, res) => {
  try {
    const img = await Gallery.findByIdAndDelete(req.params.id);
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });

    res.status(200).json({ success: true, message: 'Image deleted from gallery' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting image' });
  }
};
