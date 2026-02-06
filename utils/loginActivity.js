const LoginActivity = require('../models/LoginActivity');
const geoip = require('geoip-lite');

const USER_MODEL_BY_ROLE = {
  player: 'Player',
  institution: 'Institution',
  official: 'TechnicalOfficial',
  admin: 'Admin',
};

const MAX_LOGIN_ENTRIES = 3;

const pruneExcessLogEntries = async (userId, role) => {
  if (!userId || !role) return;
  const filter = { userId, userType: role };
  const total = await LoginActivity.countDocuments(filter);
  if (total <= MAX_LOGIN_ENTRIES) return;
  const excess = total - MAX_LOGIN_ENTRIES;
  const toRemove = await LoginActivity.find(filter).sort({ createdAt: 1 }).limit(excess).select('_id');
  const ids = toRemove.map((doc) => doc._id).filter(Boolean);
  if (ids.length) {
    await LoginActivity.deleteMany({ _id: { $in: ids } });
  }
};

const normalizeCountry = (value) => {
  if (!value) return null;
  const upper = String(value).trim().toUpperCase();
  if (!upper || upper === 'XX' || upper === '??') return null;
  return upper;
};

const extractIps = (req) => {
  const forwardedHeader = req.headers['x-forwarded-for'];
  if (forwardedHeader) {
    const [client] = forwardedHeader.split(',');
    return {
      forwardedIp: forwardedHeader,
      ip: client ? client.trim() : forwardedHeader.trim(),
    };
  }
  return {
    forwardedIp: null,
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
  };
};

const resolveGeoCoordinates = (ipAddress) => {
  if (!ipAddress) return { latitude: null, longitude: null };
  try {
    const lookup = geoip.lookup(ipAddress);
    if (lookup && Array.isArray(lookup.ll) && lookup.ll.length === 2) {
      const [lat, lon] = lookup.ll;
      return {
        latitude: Number.isNaN(Number(lat)) ? null : Number(lat),
        longitude: Number.isNaN(Number(lon)) ? null : Number(lon),
      };
    }
  } catch (error) {
    console.error('Geo lookup failed', error);
  }
  return { latitude: null, longitude: null };
};

const logLoginActivity = async ({ req, userId, role, email, loginType, coordinates }) => {
  if (!req || !userId || !role) return;
  const userModel = USER_MODEL_BY_ROLE[role];
  if (!userModel) return;

  try {
      const { ip, forwardedIp } = extractIps(req);
      const location = resolveGeoCoordinates(ip);
      const latitude = typeof coordinates?.latitude === 'number' ? coordinates.latitude : location.latitude;
      const longitude = typeof coordinates?.longitude === 'number' ? coordinates.longitude : location.longitude;
    const payload = {
      userId,
      userType: role,
      userModel,
      email: email || null,
      ip,
      forwardedIp,
      userAgent: req.headers['user-agent'] || '',
      acceptLanguage: req.headers['accept-language'] || '',
      referer: req.headers['referer'] || req.headers['referrer'] || '',
      path: req.originalUrl || req.url || '',
      method: req.method,
      host: req.headers.host || '',
      loginType: loginType || '',
       latitude,
       longitude,
      country: normalizeCountry(req.headers['cf-ipcountry'] || req.headers['x-appengine-country'] || req.headers['x-country-code']),
    };
    await LoginActivity.create(payload);
    await pruneExcessLogEntries(userId, role);
  } catch (error) {
    console.error('Failed to log login activity', error);
  }
};

const getLoginActivities = async (userId, role, limit = MAX_LOGIN_ENTRIES) => {
  if (!userId || !role) return [];
  try {
    return await LoginActivity.find({ userId, userType: role })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Failed to load login activity', error);
    return [];
  }
};

module.exports = {
  logLoginActivity,
  getLoginActivities,
};