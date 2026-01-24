const express = require('express');
const router = express.Router();
const multer = require('../middleware/multer');
const galleryController = require('../controllers/galleryController');
const { protect, admin, isSuperAdmin, requirePermission } = require('../middleware/authMiddleware');

// POST /api/gallery (admin only)
router.post('/', protect, admin, requirePermission('canAccessGallery'), multer.array('images', 20), galleryController.uploadImages);
// GET /api/gallery
router.get('/', galleryController.getAllImages);
// DELETE /api/gallery/:id (superadmin only)
router.delete('/:id', protect, requirePermission('canDelete'), galleryController.deleteImage);

module.exports = router;
