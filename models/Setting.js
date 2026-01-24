const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  showIdsToUsers: {
    type: Boolean,
    default: true,
  },

}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);