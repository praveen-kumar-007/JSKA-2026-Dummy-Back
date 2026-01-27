const express = require('express');
const router = express.Router();
const { sharePage } = require('../controllers/sharePageController');

// Public share/indexing preview for static pages
router.get('/share/page/:slug', sharePage);

module.exports = router;
