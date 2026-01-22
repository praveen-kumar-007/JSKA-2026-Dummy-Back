const express = require('express');
const router = express.Router();
const { login, me } = require('../controllers/authController');

// Public login endpoint for players/institutions/officials
router.post('/login', login);

// Return profile for token holder
router.get('/me', me);

module.exports = router;