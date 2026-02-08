const Player = require('../models/Player');
const TechnicalOfficial = require('../models/TechnicalOfficial');
const Institution = require('../models/Institution');

const normalizePlayer = (player, identifier) => ({
  role: 'player',
  idNumber: player.idNo ?? identifier,
  name: player.fullName,
  fatherName: player.fathersName,
  dob: player.dob ? player.dob.toISOString() : undefined,
  photoUrl: player.photoUrl,
  roles: (() => {
    const normalizedRole = (player.memberRole || '').toLowerCase();
    const roles = new Set(['player']);
    if (normalizedRole.includes('official') || normalizedRole.includes('referee')) roles.add('official');
    if (normalizedRole.includes('inst') || normalizedRole.includes('institution')) roles.add('institute');
    return Array.from(roles);
  })(),
  status: player.status,
});

const buildRegistrationNumber = (official) => {
  if (!official) return null;
  if (official.registrationNumber) return official.registrationNumber;
  if (official._id) return `DDKA-2026-${String(official._id).slice(-4).toUpperCase()}`;
  return null;
};

const normalizeOfficial = (official, identifier) => ({
  role: 'official',
  idNumber: buildRegistrationNumber(official) ?? official.transactionId ?? identifier,
  name: official.candidateName,
  fatherName: official.parentName,
  dob: official.dob ? official.dob.toISOString() : undefined,
  photoUrl: official.photoUrl,
  roles: ['official'],
  status: official.status,
});

const normalizeInstitution = (inst, identifier) => ({
  role: 'institute',
  idNumber: inst.regNo ?? inst.transactionId ?? identifier,
  name: inst.instName,
  fatherName: inst.headName ?? '--',
  dob: inst.year ? new Date(`${inst.year}-01-01`).toISOString() : undefined,
  photoUrl: inst.instLogoUrl,
  roles: ['institute'],
  status: inst.status,
});

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const OFFICIAL_REGISTRATION_REGEX = /^DDKA-2026-([A-F0-9]{4})$/i;

const buildExactMatch = (identifierRaw) => {
  const escaped = escapeRegExp(identifierRaw);
  return new RegExp(`^${escaped}$`, 'i');
};

const buildFlexibleDigitRegex = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const pattern = digits.split('').map((char) => escapeRegExp(char)).join('\\D*');
  return new RegExp(`^${pattern}$`, 'i');
};

const buildIdentifierMatchQueries = (
  identifierRaw,
  { exactFields = [], digitFields = [] } = {}
) => {
  const trimmed = String(identifierRaw ?? '').trim();
  if (!trimmed) return [];

  const queries = [];
  const exactMatch = buildExactMatch(trimmed);
  if (exactMatch) {
    exactFields.forEach((field) => queries.push({ [field]: exactMatch }));
  }

  const digitMatch = buildFlexibleDigitRegex(trimmed);
  if (digitMatch) {
    digitFields.forEach((field) => queries.push({ [field]: digitMatch }));
  }

  return queries;
};

const getOfficialRegistrationSuffix = (value) => {
  if (!value) return null;
  const match = value.trim().match(OFFICIAL_REGISTRATION_REGEX);
  return match ? match[1].toUpperCase() : null;
};

const buildOfficialIdExpr = (suffix) => ({
  $expr: {
    $regexMatch: {
      input: { $toUpper: { $toString: '$_id' } },
      regex: `${suffix}$`
    }
  }
});

const findOfficialByIdentifier = async (identifierRaw) => {
  const queries = buildIdentifierMatchQueries(identifierRaw, {
    exactFields: ['transactionId', 'email', 'mobile', 'aadharNumber'],
    digitFields: ['mobile', 'aadharNumber']
  });

  const suffix = getOfficialRegistrationSuffix(identifierRaw);
  if (suffix) {
    queries.push(buildOfficialIdExpr(suffix));
  }

  if (!queries.length) return null;
  return TechnicalOfficial.findOne({ $or: queries }).lean();
};

const buildExactMatchFromValue = (value) => (value ? buildExactMatch(value) : null);

const findPlayerByContact = async ({ email, phone }) => {
  const queries = [];
  const emailMatch = buildExactMatchFromValue(email?.trim());
  const phoneMatch = buildExactMatchFromValue(phone?.trim());
  if (emailMatch) queries.push({ email: emailMatch });
  if (phoneMatch) queries.push({ phone: phoneMatch });
  if (!queries.length) return null;
  return Player.findOne({ $or: queries }).lean();
};

const findOfficialByContact = async ({ email, mobile }) => {
  const queries = [];
  const emailMatch = buildExactMatchFromValue(email?.trim());
  const mobileMatch = buildExactMatchFromValue(mobile?.trim());
  if (emailMatch) queries.push({ email: emailMatch });
  if (mobileMatch) queries.push({ mobile: mobileMatch });
  if (!queries.length) return null;
  return TechnicalOfficial.findOne({ $or: queries }).lean();
};

const findPlayerByIdentifier = async (identifierRaw) => {
  const queries = buildIdentifierMatchQueries(identifierRaw, {
    exactFields: ['idNo', 'transactionId', 'email', 'phone', 'aadharNumber'],
    digitFields: ['phone', 'aadharNumber']
  });

  if (!queries.length) return null;
  return Player.findOne({ $or: queries }).lean();
};

const findInstitutionByIdentifier = async (identifierRaw) => {
  const queries = buildIdentifierMatchQueries(identifierRaw, {
    exactFields: ['regNo', 'transactionId', 'email', 'officePhone', 'altPhone'],
    digitFields: ['officePhone', 'altPhone']
  });

  if (!queries.length) return null;
  return Institution.findOne({ $or: queries }).lean();
};

const respondWithRecord = (res, record, normalizeFn, normalizedId) => {
  if (!record) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }
  return res.status(200).json({
    success: true,
    message: 'Record found',
    data: normalizeFn(record, normalizedId)
  });
};

const getPlayerVerification = async (req, res) => {
  try {
    const identifierRaw = String(req.params.id || '').trim();
    if (!identifierRaw) {
      return res.status(400).json({ success: false, message: 'ID is required' });
    }
    const normalizedId = identifierRaw.toUpperCase();
    const player = await findPlayerByIdentifier(identifierRaw);
    return respondWithRecord(res, player, normalizePlayer, normalizedId);
  } catch (error) {
    console.error('player verification lookup error:', error);
    return res.status(500).json({ success: false, message: 'Verification lookup failed' });
  }
};

const getOfficialVerification = async (req, res) => {
  try {
    const identifierRaw = String(req.params.id || '').trim();
    if (!identifierRaw) {
      return res.status(400).json({ success: false, message: 'ID is required' });
    }
    const normalizedId = identifierRaw.toUpperCase();
    const official = await findOfficialByIdentifier(identifierRaw);
    return respondWithRecord(res, official, normalizeOfficial, normalizedId);
  } catch (error) {
    console.error('official verification lookup error:', error);
    return res.status(500).json({ success: false, message: 'Verification lookup failed' });
  }
};

const getInstitutionVerification = async (req, res) => {
  try {
    const identifierRaw = String(req.params.id || '').trim();
    if (!identifierRaw) {
      return res.status(400).json({ success: false, message: 'ID is required' });
    }
    const normalizedId = identifierRaw.toUpperCase();
    const inst = await findInstitutionByIdentifier(identifierRaw);
    return respondWithRecord(res, inst, normalizeInstitution, normalizedId);
  } catch (error) {
    console.error('institution verification lookup error:', error);
    return res.status(500).json({ success: false, message: 'Verification lookup failed' });
  }
};

const lookupByIdentifier = async (req, res) => {
  try {
    const identifierRaw = String(req.params.id || '').trim();
    if (!identifierRaw) {
      return res.status(400).json({ success: false, message: 'ID is required' });
    }

    const normalizedId = identifierRaw.toUpperCase();

    const [player, official, institution] = await Promise.all([
      findPlayerByIdentifier(identifierRaw),
      findOfficialByIdentifier(identifierRaw),
      findInstitutionByIdentifier(identifierRaw)
    ]);

    let resolvedPlayer = player;
    let resolvedOfficial = official;

    if (!resolvedOfficial && resolvedPlayer) {
      if (resolvedPlayer.transactionId) {
        resolvedOfficial = await findOfficialByIdentifier(resolvedPlayer.transactionId);
      }
      if (!resolvedOfficial) {
        resolvedOfficial = await findOfficialByContact({ email: resolvedPlayer.email, mobile: resolvedPlayer.phone });
      }
    }

    if (!resolvedPlayer && resolvedOfficial) {
      if (resolvedOfficial.transactionId) {
        const playerMatch = buildExactMatch(resolvedOfficial.transactionId);
        resolvedPlayer = await Player.findOne({ transactionId: playerMatch }).lean();
      }
      if (!resolvedPlayer) {
        resolvedPlayer = await findPlayerByContact({ email: resolvedOfficial.email, phone: resolvedOfficial.mobile });
      }
    }

    if (!resolvedPlayer && !resolvedOfficial && !institution) {
      return res.status(404).json({ success: false, message: 'No record found for that ID' });
    }

    const playerRecord = resolvedPlayer ? normalizePlayer(resolvedPlayer, normalizedId) : undefined;
    const officialRecord = resolvedOfficial ? normalizeOfficial(resolvedOfficial, normalizedId) : undefined;
    const instRecord = institution ? normalizeInstitution(institution, normalizedId) : undefined;

    const prioritizedRecords = [];
    if (officialRecord) prioritizedRecords.push(officialRecord);
    if (playerRecord) prioritizedRecords.push(playerRecord);
    if (instRecord) prioritizedRecords.push(instRecord);

    if (!prioritizedRecords.length) {
      return res.status(404).json({ success: false, message: 'No data to return' });
    }

    const aggregatedRoles = new Set();
    prioritizedRecords.forEach((rec) => {
      (rec.roles || []).forEach((role) => aggregatedRoles.add(role));
    });

    return res.status(200).json({
      success: true,
      message: 'Record found',
      data: {
        ...prioritizedRecords[0],
        idNumber: prioritizedRecords[0].idNumber || normalizedId,
        roles: Array.from(aggregatedRoles),
        records: prioritizedRecords
      }
    });
  } catch (error) {
    console.error('verification lookup error:', error);
    return res.status(500).json({ success: false, message: 'Verification lookup failed' });
  }
};

module.exports = {
  lookupByIdentifier,
  getPlayerVerification,
  getOfficialVerification,
  getInstitutionVerification
};