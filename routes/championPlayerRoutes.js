const express = require('express');
const router = express.Router();
const championPlayerController = require('../controllers/championPlayerController');

// Admin routes for champion players management
router.get('/', championPlayerController.getAllPlayers);
router.post('/', championPlayerController.createPlayer);
router.put('/:id', championPlayerController.updatePlayer);
router.delete('/:id', championPlayerController.deletePlayer);

module.exports = router;
