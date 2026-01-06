const fetch = require('node-fetch');

/**
 * Verify a Google reCAPTCHA token server-side.
 *
 * In development (NODE_ENV !== 'production') and when RECAPTCHA_SECRET_KEY
 * is not set, this function returns true so local testing works without keys.
 */
async function verifyRecaptcha(token, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // If no secret configured, skip verification in non-production
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[reCAPTCHA] RECAPTCHA_SECRET_KEY not set; skipping verification in non-production environment.');
      return true;
    }
    console.error('[reCAPTCHA] RECAPTCHA_SECRET_KEY missing in production. Rejecting verification.');
    return false;
  }

  if (!token) {
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error('[reCAPTCHA] Verification HTTP error:', res.status, res.statusText);
      return false;
    }

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('[reCAPTCHA] Verification failed:', err.message || err);
    return false;
  }
}

module.exports = verifyRecaptcha;
