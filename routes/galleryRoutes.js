const express = require('express');
const router = express.Router();
const multer = require('../middleware/multer');
const galleryController = require('../controllers/galleryController');
const { protect, admin, isSuperAdmin, requirePermission } = require('../middleware/authMiddleware');

// POST /api/gallery (admin only)
router.post('/', protect, admin, requirePermission('canAccessGallery'), multer.array('images', 20), galleryController.uploadImages);
// GET /api/gallery
router.get('/', galleryController.getAllImages);
// Diagnostic endpoint - checks stored image URLs (admin only)
router.get('/diagnose', protect, admin, requirePermission('canAccessGallery'), galleryController.diagnoseImages);

// Admin-only cleanup endpoint - can be run in production by an authenticated admin
router.post('/clean', protect, admin, requirePermission('canAccessGallery'), galleryController.cleanGalleryUrls);

// Public diagnostic (development only) - not available in production
if (process.env.NODE_ENV !== 'production') {
  router.get('/diagnose-public', galleryController.diagnoseImages);
  // Dev-only cleanup endpoint to remove whitespace/newlines from stored URLs
  router.post('/diagnose-clean-public', galleryController.cleanGalleryUrls);
}
// DELETE /api/gallery/:id (superadmin only)
router.delete('/:id', protect, requirePermission('canDelete'), galleryController.deleteImage);

module.exports = router;
