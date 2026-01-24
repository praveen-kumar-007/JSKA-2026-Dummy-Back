const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Protect routes - verify token
const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];

    // Header present but token missing (e.g. "Bearer " only)
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get admin from token
      req.admin = await Admin.findById(decoded.id).select('-password');
      if (!req.admin) {
        return res.status(401).json({ message: 'Not authorized, admin not found' });
      }

      // Attach role and permissions for downstream checks
      req.adminRole = req.admin.role;
      req.adminPermissions = req.admin.permissions || {};

      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // No Authorization header or not Bearer format
  return res.status(401).json({ message: 'Not authorized, no token' });
};

// Admin middleware (any logged-in admin)
const admin = (req, res, next) => {
  if (req.admin) {
    return next();
  }
  return res.status(401).json({ message: 'Not authorized as admin' });
};

// Superadmin-only middleware
const isSuperAdmin = (req, res, next) => {
  if (req.admin && req.admin.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ message: 'Only superadmin can perform this action' });
};

// Factory for fine-grained permission checks
const requirePermission = (permissionKey) => (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ message: 'Not authorized as admin' });
  }

  // Superadmin should be able to perform any permissioned action
  if (req.admin && req.admin.role === 'superadmin') {
    return next();
  }

  // Respect explicit permissions for all roles
  if (req.adminPermissions && req.adminPermissions[permissionKey]) {
    return next();
  }

  return res.status(403).json({ message: 'You do not have permission for this action' });
};

module.exports = { protect, admin, isSuperAdmin, requirePermission };
