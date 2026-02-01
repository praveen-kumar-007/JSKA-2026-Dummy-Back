const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, // Generated Admin ID
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
    role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
    // Permissions are aligned with admin dashboard tabs
    permissions: {
        // Top row tiles
        canAccessGallery: { type: Boolean, default: true },              // "Manage Gallery" tab
        canAccessNews: { type: Boolean, default: true },                 // "Manage News" tab
        canAccessContacts: { type: Boolean, default: true },             // "Contact Forms" tab
        canAccessChampions: { type: Boolean, default: true },            // "Our Champions" tab
        canAccessReferees: { type: Boolean, default: true },             // "Referee Board" tab
        canAccessTechnicalOfficials: { type: Boolean, default: true },   // "Technical Officials" tab
        canAccessUnifiedSearch: { type: Boolean, default: true },        // "Unified Search" page
        // Second row tiles
        canAccessPlayerDetails: { type: Boolean, default: true },        // "Player Details" tab
        canAccessInstitutionDetails: { type: Boolean, default: true },   // "Institution Details" tab
        // Donations and Important Docs
        canAccessDonations: { type: Boolean, default: true },            // Donations management
        canAccessImportantDocs: { type: Boolean, default: true },       // Important Docs dropdown
        // Deletes remain reserved for superadmin, but is still permission-controlled for UI
        canDelete: { type: Boolean, default: false }
    }
});

module.exports = mongoose.model('Admin', adminSchema);