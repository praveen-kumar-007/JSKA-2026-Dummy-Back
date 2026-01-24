const express = require('express');
const router = express.Router();
const multer = require('../middleware/multer');
const newsController = require('../controllers/newsController');
const { protect, admin, isSuperAdmin, requirePermission } = require('../middleware/authMiddleware');

// POST /api/news (admin only)
router.post('/', protect, admin, requirePermission('canAccessNews'), multer.array('images', 2), newsController.createNews);
// GET /api/news
router.get('/', newsController.getAllNews);
// Share preview page for social platforms (server-rendered HTML)
router.get('/share/:id', newsController.shareNewsById);
// GET /api/news/:id
router.get('/:id', newsController.getNewsById);

// PATCH /api/news/:id/status (admin only)
router.patch('/:id/status', protect, admin, requirePermission('canAccessNews'), newsController.updateNewsStatus);

// DELETE /api/news/:id (requires delete permission)
router.delete('/:id', protect, requirePermission('canDelete'), newsController.deleteNews);

module.exports = router;
