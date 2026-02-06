const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logLoginActivity, getLoginActivities } = require('../utils/loginActivity');

// Generate JWT for admin, include role
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Admin Signup
const signup = async (req, res) => {
  try {
    const { adminId, email, password, confirmPassword } = req.body;

    // Validation
    if (!adminId || !email || !password) {
      return res.status(400).json({ success: false, message: 'Admin ID, email and password are required' });
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
    const existingAdmin = await Admin.findOne({
      $or: [{ username: adminId.trim() }, { email: email.trim().toLowerCase() }]
    });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: 'Admin with this ID or Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine role: first admin is superadmin, others are admin
    const adminCount = await Admin.countDocuments();
    const role = adminCount === 0 ? 'superadmin' : 'admin';

    // Default permissions: aligned with dashboard tabs
    // Superadmin has access to all sections including delete; admins have all sections but cannot delete by default
    const basePermissions = {
      canAccessGallery: true,
      canAccessNews: true,
      canAccessContacts: true,
      canAccessChampions: true,
      canAccessReferees: true,
      canAccessTechnicalOfficials: true,
      canAccessUnifiedSearch: true,
      canAccessPlayerDetails: true,
      canAccessInstitutionDetails: true,
      canAccessDonations: true,
      canAccessImportantDocs: true,
    };

    const permissions = role === 'superadmin'
      ? { ...basePermissions, canDelete: true }
      : { ...basePermissions, canDelete: false };

    // Create new admin
    const newAdmin = new Admin({
      username: adminId.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      permissions,
    });

    await newAdmin.save();

    res.status(201).json({
      success: true,
      message: `Admin account created successfully as ${role}. You can now login.`,
      adminId: newAdmin.username,
      role: newAdmin.role,
      permissions: newAdmin.permissions,
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin account', error: error.message });
  }
};

// Admin Login
const login = async (req, res) => {
  try {
    const { adminId, password } = req.body; // adminId can be ID or email

    // Validation
    if (!adminId || !password) {
      return res.status(400).json({ success: false, message: 'Admin ID/Email and password are required' });
    }

    // Find admin by username or email
    const identifier = adminId.trim();
    const admin = await Admin.findOne({
      $or: [{ username: identifier }, { email: identifier.toLowerCase() }]
    });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid Admin ID or Password' });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Admin ID or Password' });
    }

    // Successful login - issue JWT for protected admin routes
    const activityUserId = admin._id;
    if (activityUserId) {
      await logLoginActivity({
        req,
        userId: activityUserId,
        role: 'admin',
        email: admin.email,
        loginType: admin.role,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Login successful',
      adminId: admin.username,
      role: admin.role,
      permissions: admin.permissions,
      token: generateToken(admin._id, admin.role),
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
// List all admins (superadmin only)
const listAdmins = async (_req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.status(200).json({ success: true, admins });
  } catch (error) {
    console.error('List Admins Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
};

const getAdminLoginHistory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Admin id is required' });
    }

    const adminDoc = await Admin.findById(id).select('-password');
    if (!adminDoc) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const activities = await getLoginActivities(adminDoc._id, 'admin');
    return res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error('Admin Login History Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin login history' });
  }
};

// Get current admin profile (for dashboard to refresh latest permissions)
const getCurrentAdmin = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // req.admin is already selected without password in auth middleware
    return res.status(200).json({ success: true, admin: req.admin });
  } catch (error) {
    console.error('Get Current Admin Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin profile' });
  }
};

// Update an admin's role/permissions (superadmin only)
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, permissions } = req.body;

    const adminDoc = await Admin.findById(id);
    if (!adminDoc) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Prevent demoting the last superadmin
    if (
      adminDoc.role === 'superadmin' &&
      role === 'admin'
    ) {
      const superCount = await Admin.countDocuments({ role: 'superadmin' });
      if (superCount <= 1) {
        return res.status(400).json({ success: false, message: 'At least one superadmin is required' });
      }
    }

    if (role) {
      adminDoc.role = role;
      // If upgrading from admin to superadmin and no explicit permissions provided,
      // grant full default permissions.
      if (role === 'superadmin' && !permissions) {
        adminDoc.permissions = {
          canAccessGallery: true,
          canAccessNews: true,
          canAccessContacts: true,
          canAccessChampions: true,
          canAccessReferees: true,
          canAccessTechnicalOfficials: true,
          canAccessUnifiedSearch: true,
          canAccessPlayerDetails: true,
          canAccessInstitutionDetails: true,
          canDelete: true,
        };
      }
    }

    if (permissions && typeof permissions === 'object') {
      const currentPermissions = adminDoc.permissions
        ? adminDoc.permissions.toObject ? adminDoc.permissions.toObject() : adminDoc.permissions
        : {};

      adminDoc.permissions = {
        ...currentPermissions,
        ...permissions,
      };
    }

    await adminDoc.save();
    res.status(200).json({ success: true, admin: adminDoc });
  } catch (error) {
    console.error('Update Admin Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update admin', error: error.message });
  }
};

module.exports = { signup, login, checkAdminExists, listAdmins, updateAdmin, getCurrentAdmin, getAdminLoginHistory };
