const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure temporary storage
const upload = multer({ dest: 'uploads/' });

// Ensure these names match the 'exports.xxxx' in your controller exactly
const { 
    registerPlayer, 
    getAllPlayers, 
    updatePlayerStatus, 
    deletePlayer 
} = require('../controllers/playerController');

/**
 * @route   POST /api/players/register
 * @desc    Register a player with 4 mandatory binary files
 * @access  Public
 */
router.post('/register', upload.fields([
    { name: 'photo', maxCount: 1 },    // Profile Photo
    { name: 'front', maxCount: 1 },    // Aadhar Front
    { name: 'back', maxCount: 1 },     // Aadhar Back
    { name: 'receipt', maxCount: 1 }   // Payment Receipt (NEW)
]), registerPlayer);

/**
 * @route   GET /api/players
 * @desc    Fetch all player records for Admin Dashboard
 */
router.get('/', getAllPlayers);

/**
 * @route   PUT /api/players/status
 * @desc    Update verification status (Approve/Reject)
 */
router.put('/status', updatePlayerStatus);

/**
 * @route   DELETE /api/players/:id
 * @desc    Delete a player record permanently
 */
router.delete('/:id', deletePlayer);

module.exports = router;