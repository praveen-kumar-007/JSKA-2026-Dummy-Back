const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');

// Temporary disk storage for uploads (Cloudinary will store permanently)
const upload = multer({ dest: 'uploads/' });

const {
  registerTechnicalOfficial,
  getAllTechnicalOfficials,
  getTechnicalOfficialById,
  updateTechnicalOfficialStatus,
  updateTechnicalOfficial,
  deleteTechnicalOfficial
} = require('../controllers/technicalOfficialController');

// Public registration route
router.post(
  '/register',
  upload.fields([
    { name: 'signature', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'receipt', maxCount: 1 }
  ]),
  registerTechnicalOfficial
);

// Admin routes (protected)
router.get('/', protect, admin, getAllTechnicalOfficials);
router.get('/:id', protect, admin, getTechnicalOfficialById);
router.put('/status', protect, admin, updateTechnicalOfficialStatus);
router.put('/:id', protect, admin, updateTechnicalOfficial);
router.delete('/:id', protect, admin, deleteTechnicalOfficial);

module.exports = router;
