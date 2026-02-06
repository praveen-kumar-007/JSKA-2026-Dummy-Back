const jwt = require('jsonwebtoken');
const Player = require('../models/Player');
const Institution = require('../models/Institution');
const TechnicalOfficial = require('../models/TechnicalOfficial');
const Donation = require('../models/Donation');
const { logLoginActivity, getLoginActivities } = require('../utils/loginActivity');


const generateToken = (id, role, extra = {}) => {
  const payload = { id, role, ...extra };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Helper to standardize user data returned to client (exclude payment fields)
const sanitizeUser = (doc, role) => {
  if (!doc) return null;

  if (role === 'player') {
    return {
      id: doc._id,
      fullName: doc.fullName,
      fathersName: doc.fathersName,
      gender: doc.gender,
      dob: doc.dob,
      bloodGroup: doc.bloodGroup,
      email: doc.email,
      phone: doc.phone,
      parentsPhone: doc.parentsPhone,
      address: doc.address,
      aadharNumber: doc.aadharNumber,
      photoUrl: doc.photoUrl,
      aadharFrontUrl: doc.aadharFrontUrl,
      aadharBackUrl: doc.aadharBackUrl,
      idNo: doc.idNo,
      memberRole: doc.memberRole,
      status: doc.status,
      createdAt: doc.createdAt
    };
  }

  if (role === 'institution') {
    return {
      id: doc._id,
      instType: doc.instType,
      instName: doc.instName,
      regNo: doc.regNo,
      year: doc.year,
      headName: doc.headName,
      secretaryName: doc.secretaryName,
      totalPlayers: doc.totalPlayers,
      area: doc.area,
      surfaceType: doc.surfaceType,
      officePhone: doc.officePhone,
      altPhone: doc.altPhone,
      email: doc.email,
      address: doc.address,
      acceptedTerms: doc.acceptedTerms,
      screenshotUrl: doc.screenshotUrl,
      instLogoUrl: doc.instLogoUrl,
      status: doc.status,
      createdAt: doc.createdAt
    };
  }

  if (role === 'official') {
    return {
      id: doc._id,
      candidateName: doc.candidateName,
      parentName: doc.parentName,
      dob: doc.dob,
      address: doc.address,
      aadharNumber: doc.aadharNumber,
      gender: doc.gender,
      bloodGroup: doc.bloodGroup,
      playerLevel: doc.playerLevel,
      work: doc.work,
      mobile: doc.mobile,
      education: doc.education,
      email: doc.email,
      signatureUrl: doc.signatureUrl,
      photoUrl: doc.photoUrl,
      examScore: doc.examScore,
      grade: doc.grade,
      status: doc.status,
      remarks: doc.remarks,
      createdAt: doc.createdAt
    };
  }

  if (role === 'donor') {
    // doc is expected to be a lightweight donor object constructed in login/me
    return {
      email: doc.email,
      phone: doc.phone,
      totalDonations: doc.totalDonations || 0,
      confirmedCount: doc.confirmedCount || 0,
      confirmedDonations: doc.confirmedDonations || [],
      latestDonationId: doc.latestDonationId || null,
      createdAt: doc.createdAt || null
    };
  }

  return null;
};

// POST /api/auth/login
// body: { type: 'player'|'institution'|'official', email, password }
// NOTE: Login is performed using Email + Registered Mobile number (mobile used as password).
const login = async (req, res) => {
  try {
    const { type, email, password, latitude, longitude } = req.body;

    if (!type || !email || !password) {
      return res.status(400).json({ success: false, message: 'Type, email and password (registered mobile) are required' });
    }

    const lowerEmail = String(email).trim().toLowerCase();

    let user = null;
    let role = null;

    // Helper to normalize phone numbers: keep only digits and compare last 10 digits
    const normalizePhone = (p) => (String(p || '').replace(/\D/g, ''));
    const lastN = (str, n) => (str ? str.slice(-n) : str);

    if (type === 'player') {
      // Find by email (player must have idNo generated)
      user = await Player.findOne({ email: lowerEmail });
      role = 'player';

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or credentials' });
      }

      // Ensure the player's ID number exists and they are approved
      if (!user.idNo) {
        return res.status(403).json({ success: false, message: 'Player ID not generated yet' });
      }

      // Only allow approved players
      if (user.status !== 'Approved') {
        return res.status(403).json({ success: false, message: 'Player registration not approved yet' });
      }

      // Validate password equals registered phone number (compare last 10 digits)
      const provided = normalizePhone(password);
      const stored = normalizePhone(user.phone);
      if (!provided || !stored || lastN(provided, 10) !== lastN(stored, 10)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

    } else if (type === 'institution') {
      // Institutions login by email + registered phone (officePhone or altPhone)
      user = await Institution.findOne({ email: lowerEmail });
      role = 'institution';

      if (!user) return res.status(401).json({ success: false, message: 'Invalid email or credentials' });

      // Only approved institutions allowed
      if (user.status !== 'Approved') {
        return res.status(403).json({ success: false, message: 'Institution registration not approved yet' });
      }

      const provided = normalizePhone(password);
      const stored = normalizePhone(user.officePhone || user.altPhone || '');
      if (!provided || !stored || lastN(provided, 10) !== lastN(stored, 10)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

    } else if (type === 'official') {
      // Officials login by email + registered mobile (mobile)
      user = await TechnicalOfficial.findOne({ email: lowerEmail });
      role = 'official';

      if (!user) return res.status(401).json({ success: false, message: 'Invalid email or credentials' });

      // Only approved officials allowed
      if (user.status !== 'Approved') {
        return res.status(403).json({ success: false, message: 'Official registration not approved yet' });
      }

      const provided = normalizePhone(password);
      const stored = normalizePhone(user.mobile || '');
      if (!provided || !stored || lastN(provided, 10) !== lastN(stored, 10)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

    } else if (type === 'donor') {
      // Donor login by email + registered phone (phone supplied on donation)
      const donations = await Donation.find({ email: { $regex: `^${lowerEmail}$`, $options: 'i' } });
      if (!donations || donations.length === 0) return res.status(401).json({ success: false, message: 'No donations found for this email' });

      const provided = normalizePhone(password);
      if (!provided) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      // Find a donation with matching phone (compare last 10 digits)
      const matched = donations.find(d => {
        const stored = normalizePhone(d.phone || '');
        return stored && lastN(stored, 10) === lastN(provided, 10);
      });

      if (!matched) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      // Require at least one confirmed donation for this donor-phone pair
      const confirmedDonations = donations.filter(d => {
        const stored = normalizePhone(d.phone || '');
        return stored && lastN(stored, 10) === lastN(provided, 10) && d.status === 'confirmed';
      });

      if (!confirmedDonations || confirmedDonations.length === 0) {
        return res.status(403).json({ success: false, message: 'No confirmed donations found. Your donation is pending verification.' });
      }

      // Build a lightweight donor profile
      user = {
        email: lowerEmail,
        phone: matched.phone || '',
        totalDonations: donations.length,
        confirmedCount: confirmedDonations.length,
        confirmedDonations: confirmedDonations.map(d => ({ id: d._id, amount: d.amount, receiptNumber: d.receiptNumber, createdAt: d.createdAt, status: d.status })),
        latestDonationId: confirmedDonations[0] ? confirmedDonations[0]._id : null
      };
      role = 'donor';

    } else {
      return res.status(400).json({ success: false, message: 'Invalid user type' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or record not found' });
    }

    // Choose token id and optional extra claims
    let tokenId = null;
    let extra = {};
    if (role === 'donor') {
      // For donors, use normalized email as token id and include last 10 digits of phone to scope profile
      tokenId = lowerEmail;
      try { extra.donorPhone = String(provided).replace(/\D/g, '').slice(-10); } catch (e) { extra.donorPhone = ''; }
    } else {
      tokenId = (user && (user._id || user.id)) ? (user._id || user.id) : null;
    }

    const token = generateToken(tokenId, role, extra);
    const profile = sanitizeUser(user, role);

    if (['player', 'institution', 'official'].includes(role)) {
      const activityUserId = user && (user._id || user.id) ? (user._id || user.id) : null;
      if (activityUserId) {
        const parseCoordinate = (value) => {
          const num = typeof value === 'number' ? value : Number(value);
          return Number.isFinite(num) ? num : null;
        };

        await logLoginActivity({
          req,
          userId: activityUserId,
          role,
          email: lowerEmail,
          loginType: type,
          coordinates: {
            latitude: parseCoordinate(latitude),
            longitude: parseCoordinate(longitude),
          },
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Login successful', token, role, profile });
  } catch (error) {
    console.error('Auth Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { id, role } = decoded;
    let user = null;

    if (role === 'player') user = await Player.findById(id);
    else if (role === 'institution') user = await Institution.findById(id);
    else if (role === 'official') user = await TechnicalOfficial.findById(id);
    else if (role === 'donor') {
      // For donors, token id is the donor's lower-cased email
      const email = String(id).toLowerCase();
      const donorPhone = decoded.donorPhone || '';
      const donations = await Donation.find({ email: { $regex: `^${email}$`, $options: 'i' } }).sort({ createdAt: -1 });
      // Helper to compare last 10 digits
      const normalizePhone = (p) => String(p || '').replace(/\D/g, '');
      const lastN = (s, n) => (s ? s.slice(-n) : '');
      const confirmed = donations.filter(d => {
        if (!donorPhone) return d.status === 'confirmed';
        const stored = normalizePhone(d.phone || '');
        return d.status === 'confirmed' && lastN(stored, 10) === lastN(donorPhone, 10);
      });

      user = {
        email,
        phone: confirmed[0] ? confirmed[0].phone : (donations[0] ? donations[0].phone : ''),
        totalDonations: donations.length,
        confirmedCount: confirmed.length,
        confirmedDonations: confirmed.map(d => ({ id: d._id, amount: d.amount, receiptNumber: d.receiptNumber, createdAt: d.createdAt, status: d.status })),
        latestDonationId: confirmed[0] ? confirmed[0]._id : null
      };
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const profile = sanitizeUser(user, role);
    if (profile && ['player', 'institution', 'official'].includes(role)) {
      const activityUserId = user._id;
      if (activityUserId) {
        const activities = await getLoginActivities(activityUserId, role);
        profile.loginActivities = activities;
      }
    }

    return res.status(200).json({ success: true, role, profile });
  } catch (error) {
    console.error('Auth Me Error:', error);
    return res.status(401).json({ success: false, message: 'Token invalid or expired', error: error.message });
  }
};

module.exports = { login, me };