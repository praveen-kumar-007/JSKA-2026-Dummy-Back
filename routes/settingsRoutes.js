const express = require('express');
const router = express.Router();
const { getPublicSettings, getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, admin, isSuperAdmin } = require('../middleware/authMiddleware');

// Public settings for front-end
router.get('/public', getPublicSettings);

// Admin-only settings routes
router.get('/', protect, isSuperAdmin, getSettings);
router.patch('/', protect, isSuperAdmin, updateSettings);

module.exports = router;