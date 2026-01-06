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
    deletePlayer,
    getPlayerByIdNo,
    assignPlayerIdNo,
    getPlayerById,
    clearPlayerIdNo,
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
 * @route   GET /api/players/card/:idNo
 * @desc    Fetch a single player record by stored ID number for public/dedicated ID card page
 */
router.get('/card/:idNo', getPlayerByIdNo);

/**
 * @route   GET /api/players/:id
 * @desc    Fetch a single player record by Mongo _id for Admin Details
 */
router.get('/:id', getPlayerById);

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
 * @route   PUT /api/players/assign-id
 * @desc    Save/assign an ID card number (idNo) for a player
 */
router.put('/assign-id', assignPlayerIdNo);

/**
 * @route   PUT /api/players/clear-id
 * @desc    Clear/remove an assigned ID card number for a player
 */
router.put('/clear-id', clearPlayerIdNo);

/**
 * @route   DELETE /api/players/:id
 * @desc    Delete a player record permanently
 */
router.delete('/:id', deletePlayer);

module.exports = router;