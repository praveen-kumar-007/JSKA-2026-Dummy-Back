const express = require('express');
const router = express.Router();
const refereeController = require('../controllers/refereeController');
const { protect, admin, isSuperAdmin, requirePermission } = require('../middleware/authMiddleware');

// Public routes
router.get('/', refereeController.getAllReferees);

// Admin routes (Referee Board tab)
router.post('/', protect, admin, requirePermission('canAccessReferees'), refereeController.createReferee);
router.put('/:id', protect, admin, requirePermission('canAccessReferees'), refereeController.updateReferee);
router.delete('/:id', protect, requirePermission('canDelete'), refereeController.deleteReferee);

module.exports = router;
