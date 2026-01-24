const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin, isSuperAdmin, requirePermission } = require('../middleware/authMiddleware');

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

// Admin routes (protected, Technical Officials tab)
router.get('/', protect, admin, requirePermission('canAccessTechnicalOfficials'), getAllTechnicalOfficials);
router.get('/:id', protect, admin, requirePermission('canAccessTechnicalOfficials'), getTechnicalOfficialById);
router.put('/status', protect, admin, requirePermission('canAccessTechnicalOfficials'), updateTechnicalOfficialStatus);
router.put('/:id', protect, admin, requirePermission('canAccessTechnicalOfficials'), updateTechnicalOfficial);
router.delete('/:id', protect, requirePermission('canDelete'), deleteTechnicalOfficial);

module.exports = router;
