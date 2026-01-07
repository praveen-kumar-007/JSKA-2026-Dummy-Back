const express = require('express');
const router = express.Router();
const championPlayerController = require('../controllers/championPlayerController');
const { protect, admin, isSuperAdmin, requirePermission } = require('../middleware/authMiddleware');

// Public route: list of active champion players for Hall of Fame page
router.get('/public', championPlayerController.getAllPlayers);

// Admin routes for champion players management (Our Champions tab)
router.get('/', protect, admin, requirePermission('canAccessChampions'), championPlayerController.getAllPlayers);
router.post('/', protect, admin, requirePermission('canAccessChampions'), championPlayerController.createPlayer);
router.put('/:id', protect, admin, requirePermission('canAccessChampions'), championPlayerController.updatePlayer);
// Delete champion player: superadmin only
router.delete('/:id', protect, isSuperAdmin, championPlayerController.deletePlayer);

module.exports = router;
