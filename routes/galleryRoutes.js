const express = require('express');
const router = express.Router();
const multer = require('../middleware/multer');
const galleryController = require('../controllers/galleryController');

// POST /api/gallery (admin only)
router.post('/', multer.array('images', 20), galleryController.uploadImages);
// GET /api/gallery
router.get('/', galleryController.getAllImages);
// DELETE /api/gallery/:id
router.delete('/:id', galleryController.deleteImage);

module.exports = router;
