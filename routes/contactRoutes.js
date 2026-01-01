const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// POST /api/contact - Contact form (public)
router.post('/', contactController.sendContactForm);

// Admin: get all contact messages
router.get('/', contactController.getAllContacts);

// Admin: update contact status
router.put('/status', contactController.updateContactStatus);

// Admin: delete a contact message
router.delete('/:id', contactController.deleteContact);

// Newsletter subscription (public)
router.post('/newsletter', contactController.subscribeNewsletter);

// Admin: list all newsletter subscriptions
router.get('/newsletter/all', contactController.getAllNewsletters);

// Admin: delete a newsletter subscription
router.delete('/newsletter/:id', contactController.deleteNewsletter);

module.exports = router;
