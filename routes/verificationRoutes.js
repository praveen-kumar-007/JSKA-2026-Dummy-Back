const express = require('express');
const {
	lookupByIdentifier,
	getPlayerVerification,
	getOfficialVerification,
	getInstitutionVerification
} = require('../controllers/verificationController');

const router = express.Router();

router.get('/:id', lookupByIdentifier);
router.get('/player/:id', getPlayerVerification);
router.get('/official/:id', getOfficialVerification);
router.get('/institution/:id', getInstitutionVerification);

module.exports = router;