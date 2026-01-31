const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  showIdsToUsers: {
    type: Boolean,
    default: true,
  },
  // Feature flags for public/export controls
  allowGallery: {
    type: Boolean,
    default: true,
  },
  allowNews: {
    type: Boolean,
    default: true,
  },
  allowContacts: {
    type: Boolean,
    default: true,
  },
  allowDonations: {
    type: Boolean,
    default: true,
  },
  allowImportantDocs: {
    type: Boolean,
    default: true,
  },
  // New export toggles
  // Unified export control: when false, all export UI/features should be disabled
  allowExportAll: {
    type: Boolean,
    default: true,
  },
  // Legacy per-module toggles (kept for backward compatibility)
  allowExportPlayers: {
    type: Boolean,
    default: true,
  },
  allowExportTechnicalOfficials: {
    type: Boolean,
    default: true,
  },
  allowExportInstitutions: {
    type: Boolean,
    default: true,
  },

}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);