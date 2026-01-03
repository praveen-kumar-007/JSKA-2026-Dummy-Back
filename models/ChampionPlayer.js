const mongoose = require('mongoose');

const championPlayerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['National Player', 'Federation Cup', 'Jharkhand Premier League']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    default: 'Male'
  },
  achievements: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChampionPlayer', championPlayerSchema);
