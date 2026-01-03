const ChampionPlayer = require('../models/ChampionPlayer');

// Get all champion players
exports.getAllPlayers = async (req, res) => {
  try {
    const players = await ChampionPlayer.find({ isActive: true }).sort({ category: 1, name: 1 });
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching players', error: error.message });
  }
};

// Get players by category
exports.getPlayersByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const players = await ChampionPlayer.find({ category, isActive: true }).sort({ name: 1 });
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching players', error: error.message });
  }
};

// Create new player
exports.createPlayer = async (req, res) => {
  try {
    const player = new ChampionPlayer(req.body);
    await player.save();
    res.status(201).json({ message: 'Player added successfully', player });
  } catch (error) {
    res.status(400).json({ message: 'Error creating player', error: error.message });
  }
};

// Update player
exports.updatePlayer = async (req, res) => {
  try {
    const player = await ChampionPlayer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json({ message: 'Player updated successfully', player });
  } catch (error) {
    res.status(400).json({ message: 'Error updating player', error: error.message });
  }
};

// Delete player
exports.deletePlayer = async (req, res) => {
  try {
    const player = await ChampionPlayer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting player', error: error.message });
  }
};
