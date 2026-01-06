const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect, admin } = require('../middleware/authMiddleware');
const { contactLimiter, newsletterLimiter } = require('../middleware/rateLimit');

// POST /api/contact - Contact form (public, but rate limited)
router.post('/', contactLimiter, contactController.sendContactForm);

// Admin: get all contact messages
router.get('/', protect, admin, contactController.getAllContacts);

// Admin: update contact status
router.put('/status', protect, admin, contactController.updateContactStatus);

// Admin: delete a contact message
router.delete('/:id', protect, admin, contactController.deleteContact);

// Newsletter subscription (public, but rate limited)
router.post('/newsletter', newsletterLimiter, contactController.subscribeNewsletter);

// Admin: list all newsletter subscriptions
router.get('/newsletter/all', protect, admin, contactController.getAllNewsletters);

// Admin: delete a newsletter subscription
router.delete('/newsletter/:id', protect, admin, contactController.deleteNewsletter);

module.exports = router;
