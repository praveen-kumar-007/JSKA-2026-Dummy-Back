const News = require('../models/News');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

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

// Helper to escape HTML entities for safe meta tags
const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Server-rendered share page for social previews (WhatsApp, Facebook, etc.)
exports.shareNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findById(id);
    if (!news) {
      return res.status(404).send('News not found');
    }

    const frontendBase = (process.env.FRONTEND_URL || 'https://dhanbadkabaddiassociation.tech').replace(/\/+$/, '');
    const articleUrl = `${frontendBase}/news/${id}`;
    const imageUrl =
      news.images && news.images.length > 0
        ? news.images[0]
        : `${frontendBase}/logo.png`;

    const rawDescription = news.content || '';
    const shortDescription =
      rawDescription.length > 180
        ? `${rawDescription.slice(0, 180)}...`
        : rawDescription;

    const title = escapeHtml(`${news.title} | DDKA Kabaddi News Dhanbad`);
    const description = escapeHtml(shortDescription);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${articleUrl}" />
    <meta property="og:image" content="${imageUrl}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <meta http-equiv="refresh" content="0;url=${articleUrl}" />
  </head>
  <body>
    <p>Redirecting to <a href="${articleUrl}">${articleUrl}</a>...</p>
    <script>window.location.replace('${articleUrl}');</script>
  </body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send('Error generating share preview');
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
