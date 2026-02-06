const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin, isSuperAdmin, requirePermission } = require('../middleware/authMiddleware');

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
    updatePlayer,
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
router.get('/:id', protect, admin, requirePermission('canAccessPlayerDetails'), getPlayerById);

/**
 * @route   GET /api/players
 * @desc    Fetch all player records for Admin Dashboard (Player Details tab)
 */
router.get('/', protect, admin, requirePermission('canAccessPlayerDetails'), getAllPlayers);

/**
 * @route   PUT /api/players/status
 * @desc    Update verification status (Approve/Reject) from Player Details tab
 */
router.put('/status', protect, admin, requirePermission('canAccessPlayerDetails'), updatePlayerStatus);

/**
 * @route   PUT /api/players/assign-id
 * @desc    Save/assign an ID card number (idNo) for a player
 */
router.put('/assign-id', protect, admin, requirePermission('canAccessPlayerDetails'), assignPlayerIdNo);

/**
 * @route   PUT /api/players/clear-id
 * @desc    Clear/remove an assigned ID card number for a player
 */
router.put('/clear-id', protect, admin, requirePermission('canAccessPlayerDetails'), clearPlayerIdNo);

/**
 * @route   PUT /api/players/:id
 * @desc    Admin: edit player core details and optionally replace documents
 *          Accepts multipart/form-data with optional files: photo, front, back, receipt
 */
router.put(
    '/:id',
    protect,
    admin,
    requirePermission('canAccessPlayerDetails'),
    upload.fields([
        { name: 'photo', maxCount: 1 },
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
        { name: 'receipt', maxCount: 1 },
    ]),
    updatePlayer
);

/**
 * @route   DELETE /api/players/:id
 * @desc    Delete a player record permanently
 */
// Delete player: requires delete permission
router.delete('/:id', protect, requirePermission('canDelete'), deletePlayer);

module.exports = router;