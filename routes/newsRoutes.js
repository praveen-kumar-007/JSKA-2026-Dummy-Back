const express = require('express');
const router = express.Router();
const multer = require('../middleware/multer');
const newsController = require('../controllers/newsController');

// POST /api/news (admin only)
router.post('/', multer.array('images', 2), newsController.createNews);
// GET /api/news
router.get('/', newsController.getAllNews);
// GET /api/news/:id
router.get('/:id', newsController.getNewsById);

// PATCH /api/news/:id/status (admin only)
router.patch('/:id/status', newsController.updateNewsStatus);

// DELETE /api/news/:id
router.delete('/:id', newsController.deleteNews);

module.exports = router;
