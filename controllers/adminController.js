const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

// Admin Signup
const signup = async (req, res) => {
  try {
    const { adminId, password, confirmPassword } = req.body;

    // Validation
    if (!adminId || !password) {
      return res.status(400).json({ success: false, message: 'Admin ID and password are required' });
    }

    if (adminId.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Admin ID must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: adminId.trim() });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: 'Admin account already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new Admin({
      username: adminId.trim(),
      password: hashedPassword
    });

    await newAdmin.save();

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully. You can now login.',
      adminId: newAdmin.username
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin account', error: error.message });
  }
};

// Admin Login
const login = async (req, res) => {
  try {
    const { adminId, password } = req.body;

    // Validation
    if (!adminId || !password) {
      return res.status(400).json({ success: false, message: 'Admin ID and password are required' });
    }

    // Find admin by username
    const admin = await Admin.findOne({ username: adminId.trim() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid Admin ID or Password' });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Admin ID or Password' });
    }

    // Successful login
    res.status(200).json({
      success: true,
      message: 'Login successful',
      adminId: admin.username
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Failed to authenticate', error: error.message });
  }
};

// Check if admin exists
const checkAdminExists = async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    res.status(200).json({
      success: true,
      exists: adminCount > 0,
      message: adminCount > 0 ? 'Admin account exists' : 'No admin account found'
    });
  } catch (error) {
    console.error('Check Admin Error:', error);
    res.status(500).json({ success: false, message: 'Failed to check admin status' });
  }
};

module.exports = { signup, login, checkAdminExists };
