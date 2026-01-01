// Update news status (publish/draft)
exports.updateNewsStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const news = await News.findByIdAndUpdate(id, { status }, { new: true });
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.status(200).json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
};
const News = require('../models/News');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Create news post (admin)
exports.createNews = async (req, res) => {
  try {
    const { title, content, category, isHighlight } = req.body;
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'ddka_news' });
        images.push(result.secure_url);
        fs.unlinkSync(file.path);
      }
    }
    const news = new News({
      title,
      content,
      category,
      isHighlight: isHighlight === 'true' || isHighlight === true,
      images
    });
    await news.save();
    res.status(201).json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating news', error: error.message });
  }
};

// Get all news
exports.getAllNews = async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching news' });
  }
};

// Get single news by ID
exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.status(200).json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching news' });
  }
};

// Delete news
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.status(200).json({ success: true, message: 'News deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting news' });
  }
};
