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
        // Clean url/public_id to remove any accidental whitespace or newline characters
        const cleanUrl = (result.secure_url || '').replace(/[\r\n\t]+/g, '')?.trim();
        const cleanPublicId = (result.public_id || '').replace(/[\r\n\t]+/g, '')?.trim();
        images.push({ url: cleanUrl, public_id: cleanPublicId });
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
    // Use .lean() to get plain objects and sanitize before sending to clients
    const images = await Gallery.find().sort({ createdAt: -1 }).lean();

    const sanitized = images.map((img) => {
      let url = (img.url || '').replace(/[\r\n\t]+/g, '').trim();
      // Convert protocol-less or http URLs to https for safe loading on secure pages
      if (url.startsWith('http://')) url = url.replace(/^http:\/\//i, 'https://');
      if (url.startsWith('//')) url = 'https:' + url;
      return { ...img, url };
    });

    res.status(200).json({ success: true, data: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching images' });
  }
};

// Delete image from DB and Cloudinary
exports.deleteImage = async (req, res) => {
  try {
    const img = await Gallery.findById(req.params.id);
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });

    try {
      if (img.public_id) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    } catch (err) {
      console.error('Failed to delete gallery image from Cloudinary:', err);
    }

    await Gallery.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Image deleted from gallery' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting image' });
  }
};

// Diagnostic endpoint - check accessibility of stored gallery URLs (admin-only)
exports.diagnoseImages = async (req, res) => {
  try {
    const images = await Gallery.find().sort({ createdAt: -1 }).lean();
    const results = [];

    for (const img of images) {
      try {
        // Try HEAD first to avoid downloading full resource
        let response = await fetch(img.url, { method: 'HEAD' });
        // Some hosts don't respond to HEAD properly; fall back to GET
        if (!response.ok || response.status === 405) {
          response = await fetch(img.url, { method: 'GET' });
        }

        const contentType = response.headers.get('content-type') || null;
        results.push({ _id: img._id, url: img.url, ok: response.ok, status: response.status, contentType });
      } catch (err) {
        results.push({ _id: img._id, url: img.url, ok: false, status: null, error: err.message });
      }
    }

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('Diagnose images error:', error);
    res.status(500).json({ success: false, message: 'Error diagnosing gallery images' });
  }
};

// Dev-only: Clean gallery URLs (remove whitespace/newlines) - available via /diagnose-clean-public
exports.cleanGalleryUrls = async (req, res) => {
  try {
    const images = await Gallery.find().lean();
    let updated = 0;
    for (const img of images) {
      let newUrl = (img.url || '').replace(/[\r\n\t]+/g, '').trim();
      // Upgrade http to https and handle protocol-less URLs
      if (newUrl.startsWith('http://')) newUrl = newUrl.replace(/^http:\/\//i, 'https://');
      if (newUrl.startsWith('//')) newUrl = 'https:' + newUrl;
      const newPublicId = (img.public_id || '').replace(/[\r\n\t]+/g, '').trim();
      if (newUrl !== img.url || newPublicId !== img.public_id) {
        await Gallery.updateOne({ _id: img._id }, { $set: { url: newUrl, public_id: newPublicId } });
        updated++;
      }
    }

    res.status(200).json({ success: true, message: 'Cleaned gallery URLs', updated });
  } catch (error) {
    console.error('Clean gallery URLs error:', error);
    res.status(500).json({ success: false, message: 'Error cleaning gallery URLs' });
  }
};
