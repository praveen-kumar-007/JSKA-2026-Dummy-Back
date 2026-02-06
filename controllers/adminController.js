const Admin = require('../models/Admin');
const LoginActivity = require('../models/LoginActivity');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logLoginActivity, getLoginActivities, MAX_LOGIN_ENTRIES } = require('../utils/loginActivity');

// Generate JWT for admin, include role
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const ALERT_DEFAULT_LIMIT = 60;

const pickLoginActivityEntry = (doc) => ({
  _id: doc._id,
  ip: doc.ip,
  forwardedIp: doc.forwardedIp,
  userAgent: doc.userAgent,
  acceptLanguage: doc.acceptLanguage,
  referer: doc.referer,
  path: doc.path,
  method: doc.method,
  loginType: doc.loginType,
  country: doc.country,
  createdAt: doc.createdAt,
  latitude: Number.isFinite(doc.latitude) ? doc.latitude : null,
  longitude: Number.isFinite(doc.longitude) ? doc.longitude : null,
});

const buildDisplayName = (userType, userDoc, fallback) => {
  if (userDoc) {
    if (userType === 'player') return userDoc.fullName || userDoc.email || fallback;
    if (userType === 'institution') return userDoc.instName || userDoc.email || fallback;
    if (userType === 'official') return userDoc.candidateName || userDoc.email || fallback;
    if (userType === 'admin') return userDoc.username || userDoc.email || fallback;
  }
  return fallback || 'Unknown account';
};

const buildUserDetails = (userType, userDoc) => {
  if (!userDoc) return null;
  const base = {
    id: userDoc._id,
    email: userDoc.email || null,
    status: userDoc.status || null,
  };

  if (userType === 'player') {
    return {
      ...base,
      fullName: userDoc.fullName,
      fathersName: userDoc.fathersName,
      phone: userDoc.phone,
      idNo: userDoc.idNo,
      dob: userDoc.dob,
    };
  }

  if (userType === 'institution') {
    return {
      ...base,
      instName: userDoc.instName,
      regNo: userDoc.regNo,
      officePhone: userDoc.officePhone,
      altPhone: userDoc.altPhone,
      instType: userDoc.instType,
      totalPlayers: userDoc.totalPlayers,
    };
  }

  if (userType === 'official') {
    return {
      ...base,
      candidateName: userDoc.candidateName,
      parentName: userDoc.parentName,
      mobile: userDoc.mobile,
      grade: userDoc.grade,
      playerLevel: userDoc.playerLevel,
    };
  }

  if (userType === 'admin') {
    return {
      ...base,
      username: userDoc.username,
      role: userDoc.role,
      permissions: userDoc.permissions || null,
    };
  }

  return base;
};

const composeUserKey = (activity) => {
  const identifier = activity.userId?._id?.toString()
    || activity.userId
    || activity.email
    || activity._id?.toString()
    || 'unknown';
  return `${activity.userModel || activity.userType || 'login'}:${identifier}`;
};

const sanitizeRequestedLimit = (value) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(150, Math.max(20, parsed));
  }
  return ALERT_DEFAULT_LIMIT;
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
    const { adminId, password, coordinates } = req.body; // adminId can be ID or email

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
        coordinates,
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

const getLoginActivityAlerts = async (req, res) => {
  try {
    const limit = sanitizeRequestedLimit(req.query.limit);
    const activities = await LoginActivity.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'fullName fathersName email phone parentsPhone instName regNo instType officePhone altPhone totalPlayers candidateName parentName mobile grade playerLevel status username role permissions idNo')
      .lean();

    const grouped = new Map();
    activities.forEach((activity) => {
      const key = composeUserKey(activity);
      const userDoc = activity.userId && typeof activity.userId === 'object' ? activity.userId : null;
      if (!grouped.has(key)) {
        grouped.set(key, {
          userKey: key,
          userType: activity.userType || activity.userModel || 'admin',
          userModel: activity.userModel || activity.userType || 'unknown',
          userId: (userDoc && userDoc._id) || (activity.userId && activity.userId._id) || activity.userId || null,
          displayName: buildDisplayName(activity.userType, userDoc, activity.email),
          email: activity.email || null,
          userDetails: buildUserDetails(activity.userType, userDoc),
          loginActivities: [],
          latestLoginAt: null,
        });
      }

      const group = grouped.get(key);
      if (group && group.loginActivities.length < MAX_LOGIN_ENTRIES) {
        group.loginActivities.push(pickLoginActivityEntry(activity));
        if (!group.latestLoginAt) {
          group.latestLoginAt = activity.createdAt;
        }
      }
    });

    const alerts = Array.from(grouped.values()).sort((a, b) => {
      const aTime = a.latestLoginAt ? new Date(a.latestLoginAt).getTime() : 0;
      const bTime = b.latestLoginAt ? new Date(b.latestLoginAt).getTime() : 0;
      return bTime - aTime;
    });

    return res.status(200).json({ success: true, alerts });
  } catch (error) {
    console.error('Login Activity Alerts Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load login activity alerts' });
  }
};

module.exports = {
  signup,
  login,
  checkAdminExists,
  listAdmins,
  updateAdmin,
  getCurrentAdmin,
  getAdminLoginHistory,
  getLoginActivityAlerts,
};
