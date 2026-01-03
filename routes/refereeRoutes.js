const express = require('express');
const router = express.Router();
const refereeController = require('../controllers/refereeController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', refereeController.getAllReferees);

// Admin routes
router.post('/', protect, admin, refereeController.createReferee);
router.put('/:id', protect, admin, refereeController.updateReferee);
router.delete('/:id', protect, admin, refereeController.deleteReferee);

module.exports = router;
