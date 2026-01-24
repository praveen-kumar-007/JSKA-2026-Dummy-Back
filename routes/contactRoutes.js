const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect, admin, isSuperAdmin, requirePermission } = require('../middleware/authMiddleware');

// POST /api/contact - Contact form (public)
router.post('/', contactController.sendContactForm);

// Admin: get all contact messages
router.get('/', protect, admin, requirePermission('canAccessContacts'), contactController.getAllContacts);

// Admin: update contact status
router.put('/status', protect, admin, requirePermission('canAccessContacts'), contactController.updateContactStatus);

// Admin: delete a contact message (requires delete permission)
router.delete('/:id', protect, requirePermission('canDelete'), contactController.deleteContact);

// Newsletter subscription (public)
router.post('/newsletter', contactController.subscribeNewsletter);

// Admin: list all newsletter subscriptions
router.get('/newsletter/all', protect, admin, requirePermission('canAccessContacts'), contactController.getAllNewsletters);

// Admin: delete a newsletter subscription (requires delete permission)
router.delete('/newsletter/:id', protect, requirePermission('canDelete'), contactController.deleteNewsletter);

module.exports = router;
