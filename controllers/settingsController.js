const Setting = require('../models/Setting');

// Get public settings (non-authenticated)
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne().sort({ createdAt: -1 });
    // defaults if not present
    const showIdsToUsers = settings ? settings.showIdsToUsers : true;
    const allowGallery = settings ? (typeof settings.allowGallery === 'boolean' ? settings.allowGallery : true) : true;
    const allowNews = settings ? (typeof settings.allowNews === 'boolean' ? settings.allowNews : true) : true;
    const allowContacts = settings ? (typeof settings.allowContacts === 'boolean' ? settings.allowContacts : true) : true;
    const allowDonations = settings ? (typeof settings.allowDonations === 'boolean' ? settings.allowDonations : true) : true;
    const allowImportantDocs = settings ? (typeof settings.allowImportantDocs === 'boolean' ? settings.allowImportantDocs : true) : true;
    const allowUnifiedSearch = settings ? (typeof settings.allowUnifiedSearch === 'boolean' ? settings.allowUnifiedSearch : true) : true;
    // New export controls (public-facing)
    const allowExportAll = settings ? (typeof settings.allowExportAll === 'boolean' ? settings.allowExportAll : true) : true;
    const allowExportPlayers = settings ? (typeof settings.allowExportPlayers === 'boolean' ? settings.allowExportPlayers : true) : true;
    const allowExportTechnicalOfficials = settings ? (typeof settings.allowExportTechnicalOfficials === 'boolean' ? settings.allowExportTechnicalOfficials : true) : true;
    const allowExportInstitutions = settings ? (typeof settings.allowExportInstitutions === 'boolean' ? settings.allowExportInstitutions : true) : true;

    res.status(200).json({ success: true, data: { showIdsToUsers, allowGallery, allowNews, allowContacts, allowDonations, allowImportantDocs, allowUnifiedSearch, allowExportAll, allowExportPlayers, allowExportTechnicalOfficials, allowExportInstitutions } });
  } catch (err) {
    console.error('getPublicSettings error', err);
    res.status(500).json({ success: false, message: 'Failed to get settings' });
  }
};

// Admin-only: get full settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: settings || { showIdsToUsers: true } });
  } catch (err) {
    console.error('getSettings error', err);
    res.status(500).json({ success: false, message: 'Failed to get settings' });
  }
};

// Admin-only: update settings
exports.updateSettings = async (req, res) => {
  try {
    const { showIdsToUsers, allowGallery, allowNews, allowContacts, allowDonations, allowImportantDocs, allowUnifiedSearch, allowExportAll, allowExportPlayers, allowExportTechnicalOfficials, allowExportInstitutions } = req.body;
    const update = {};
    if (typeof showIdsToUsers !== 'undefined') update.showIdsToUsers = showIdsToUsers;
    if (typeof allowGallery !== 'undefined') update.allowGallery = allowGallery;
    if (typeof allowNews !== 'undefined') update.allowNews = allowNews;
    if (typeof allowContacts !== 'undefined') update.allowContacts = allowContacts;
    if (typeof allowDonations !== 'undefined') update.allowDonations = allowDonations;
    if (typeof allowImportantDocs !== 'undefined') update.allowImportantDocs = allowImportantDocs;
    if (typeof allowUnifiedSearch !== 'undefined') update.allowUnifiedSearch = allowUnifiedSearch;
    if (typeof allowExportAll !== 'undefined') update.allowExportAll = allowExportAll;
    if (typeof allowExportPlayers !== 'undefined') update.allowExportPlayers = allowExportPlayers;
    if (typeof allowExportTechnicalOfficials !== 'undefined') update.allowExportTechnicalOfficials = allowExportTechnicalOfficials;
    if (typeof allowExportInstitutions !== 'undefined') update.allowExportInstitutions = allowExportInstitutions;
    const settings = await Setting.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true });
    res.status(200).json({ success: true, message: 'Settings updated', data: settings });
  } catch (err) {
    console.error('updateSettings error', err);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};