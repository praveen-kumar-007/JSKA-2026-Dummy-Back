const Setting = require('../models/Setting');

// Get public settings (non-authenticated)
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne().sort({ createdAt: -1 });
    // default true if not present
    const showIdsToUsers = settings ? settings.showIdsToUsers : true;
    res.status(200).json({ success: true, data: { showIdsToUsers } });
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
    const { showIdsToUsers } = req.body;
    const settings = await Setting.findOneAndUpdate({}, { $set: { showIdsToUsers } }, { new: true, upsert: true });
    res.status(200).json({ success: true, message: 'Settings updated', data: settings });
  } catch (err) {
    console.error('updateSettings error', err);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};