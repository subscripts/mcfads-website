// Shared helpers for the admin passcode gate.
// A "session" is a signed token: base64(expiryMs) + "." + hmac(expiryMs)
// It is NOT a per-user login — everyone with the passcode shares one role.
const crypto = require('crypto');

function getSecret() {
  // Falls back to the passcode itself if a dedicated secret isn't set,
  // so this works with just ADMIN_PASSCODE configured.
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSCODE || 'dev-secret-change-me';
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function createSessionToken(ttlMs = 1000 * 60 * 60 * 8) { // 8 hour session
  const expiry = Date.now() + ttlMs;
  const payload = String(expiry);
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString('base64');
}

function verifySessionToken(token) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [payload, sig] = decoded.split('.');
    if (!payload || !sig) return false;
    const expected = sign(payload);
    const validSig = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!validSig) return false;
    return Number(payload) > Date.now();
  } catch (e) {
    return false;
  }
}

function requireAdmin(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return verifySessionToken(token);
}

module.exports = { createSessionToken, verifySessionToken, requireAdmin };
