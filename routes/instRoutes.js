const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
    registerInstitution, 
    getAllInstitutions, 
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


// Admin Routes
router.get('/:id', getInstitutionById);      // GET /api/institutions/:id
router.get('/', getAllInstitutions);         // GET /api/institutions
router.put('/status', updateStatus);         // PUT /api/institutions/status
router.delete('/:id', deleteInstitution);    // DELETE /api/institutions/:id

module.exports = router;