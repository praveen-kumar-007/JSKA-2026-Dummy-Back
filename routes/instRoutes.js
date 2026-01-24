const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin, isSuperAdmin, requirePermission } = require('../middleware/authMiddleware');
const { 
    registerInstitution, 
    getAllInstitutions, 
    getApprovedInstitutions,
    updateStatus, 
    deleteInstitution, 
    getInstitutionById 
} = require('../controllers/instController');

// Multer setup for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Public Route: Register (payment screenshot + optional institution logo)
router.post(
    '/register',
    upload.fields([
        { name: 'screenshot', maxCount: 1 },
        { name: 'instLogo', maxCount: 1 },
    ]),
    registerInstitution
);


// Public Route: Approved institutions for Affiliated Institutions page
router.get('/public', getApprovedInstitutions); // GET /api/institutions/public

// Admin Routes (Institution Details tab)
router.get('/:id', protect, admin, requirePermission('canAccessInstitutionDetails'), getInstitutionById);      // GET /api/institutions/:id
router.get('/', protect, admin, requirePermission('canAccessInstitutionDetails'), getAllInstitutions);         // GET /api/institutions
router.put('/status', protect, admin, requirePermission('canAccessInstitutionDetails'), updateStatus);         // PUT /api/institutions/status
router.delete('/:id', protect, requirePermission('canDelete'), deleteInstitution);    // DELETE /api/institutions/:id

module.exports = router;