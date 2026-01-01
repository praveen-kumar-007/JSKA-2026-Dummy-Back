const express = require('express');
const { signup, login, checkAdminExists } = require('../controllers/adminController');

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/exists', checkAdminExists);

module.exports = router;
