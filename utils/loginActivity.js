const https = require('https');
const { URLSearchParams } = require('url');
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

const sanitizeLocationLabel = (value) => {
  if (value == null) return null;
  const label = String(value).trim();
  if (!label) return null;
  return label.length > 255 ? `${label.slice(0, 252)}...` : label;
};

const buildAddressLabel = (payload) => {
  if (!payload) return null;
  if (payload.display_name) return payload.display_name;
  const address = payload.address || {};
  const fields = [
    address.road,
    address.neighbourhood,
    address.suburb,
    address.village,
    address.town,
    address.city,
    address.state,
    address.country,
  ].filter(Boolean);
  return fields.length ? fields.join(', ') : null;
};

const reverseGeocodeCoordinates = (latitude, longitude) => new Promise((resolve) => {
  const finalize = (value) => {
    if (finalize.called) return;
    finalize.called = true;
    resolve(value);
  };

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    finalize(null);
    return;
  }

  const params = new URLSearchParams({
    format: 'json',
    lat: latitude.toString(),
    lon: longitude.toString(),
    zoom: '16',
    addressdetails: '0',
  });

  const options = {
    hostname: 'nominatim.openstreetmap.org',
    path: `/reverse?${params.toString()}`,
    method: 'GET',
    headers: {
      'User-Agent': 'JSKA-login-tracker/1.0 (contact@dhanbadkabaddiassociation.tech)'
    },
    timeout: 4000,
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode !== 200) {
        finalize(null);
        return;
      }
      try {
        const parsed = JSON.parse(data || '{}');
        const label = sanitizeLocationLabel(parsed.display_name || buildAddressLabel(parsed));
        finalize(label);
      } catch (err) {
        finalize(null);
      }
    });
  });

  req.on('error', () => finalize(null));
  req.on('timeout', () => {
    req.destroy();
    finalize(null);
  });
  req.end();
});

const parseNumberValue = (value) => {
  if (value == null) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const logLoginActivity = async ({ req, userId, role, email, loginType, coordinates }) => {
  if (!req || !userId || !role) return;
  const userModel = USER_MODEL_BY_ROLE[role];
  if (!userModel) return;

  try {
    const { ip, forwardedIp } = extractIps(req);
    const location = resolveGeoCoordinates(ip);
    const preferredLatitude = parseNumberValue(coordinates?.latitude);
    const preferredLongitude = parseNumberValue(coordinates?.longitude);
    const latitude = preferredLatitude ?? location.latitude;
    const longitude = preferredLongitude ?? location.longitude;
    const accuracy = parseNumberValue(coordinates?.accuracy);
    const locationLabel = (preferredLatitude != null && preferredLongitude != null)
      ? await reverseGeocodeCoordinates(preferredLatitude, preferredLongitude)
      : null;
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
      accuracy,
      locationLabel,
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
  MAX_LOGIN_ENTRIES,
  logLoginActivity,
  getLoginActivities,
};