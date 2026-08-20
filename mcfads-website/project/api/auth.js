const { createSessionToken } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { passcode } = req.body || {};
  const expected = process.env.ADMIN_PASSCODE;

  if (!expected) {
    res.status(500).json({ error: 'ADMIN_PASSCODE is not configured on the server.' });
    return;
  }

  if (!passcode || passcode !== expected) {
    res.status(401).json({ error: 'Wrong passcode.' });
    return;
  }

  const token = createSessionToken();
  res.status(200).json({ token });
};
