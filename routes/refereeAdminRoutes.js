const express = require('express');
const router = express.Router();
const refereeController = require('../controllers/refereeController');

// Admin routes for referee management
router.get('/', refereeController.getAllReferees);
router.post('/', refereeController.createReferee);
router.put('/:id', refereeController.updateReferee);
router.delete('/:id', refereeController.deleteReferee);

module.exports = router;
