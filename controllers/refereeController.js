const Referee = require('../models/Referee');

// Get all referees
exports.getAllReferees = async (req, res) => {
  try {
    const referees = await Referee.find({ isActive: true }).sort({ name: 1 });
    res.json(referees);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching referees', error: error.message });
  }
};

// Create new referee
exports.createReferee = async (req, res) => {
  try {
    const referee = new Referee(req.body);
    await referee.save();
    res.status(201).json({ message: 'Referee added successfully', referee });
  } catch (error) {
    res.status(400).json({ message: 'Error creating referee', error: error.message });
  }
};

// Update referee
exports.updateReferee = async (req, res) => {
  try {
    const referee = await Referee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!referee) {
      return res.status(404).json({ message: 'Referee not found' });
    }
    res.json({ message: 'Referee updated successfully', referee });
  } catch (error) {
    res.status(400).json({ message: 'Error updating referee', error: error.message });
  }
};

// Delete referee
exports.deleteReferee = async (req, res) => {
  try {
    const referee = await Referee.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!referee) {
      return res.status(404).json({ message: 'Referee not found' });
    }
    res.json({ message: 'Referee deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting referee', error: error.message });
  }
};
