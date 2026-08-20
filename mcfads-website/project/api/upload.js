const { put } = require('@vercel/blob');
const { readJson, writeJson } = require('./_lib/json-blob');
const { requireAdmin } = require('./_lib/auth');

const MANIFEST_PATH = 'data/images-manifest.json';

// Every editable image slot on the site. Keep this list in sync with the
// data-slot attributes in index.html.
const SLOTS = {
  'logo': 'Logo',
  'hero-1': 'Hero Slide 1',
  'hero-2': 'Hero Slide 2',
  'hero-3': 'Hero Slide 3',
  'hero-4': 'Hero Slide 4',
  'hero-5': 'Hero Slide 5',
  'gallery-1': 'Gallery — Hybrid inverter + dual battery storage',
  'gallery-2': 'Gallery — Dual inverters, rack-mounted battery bank',
  'gallery-3': 'Gallery — Wall-mounted battery storage',
  'gallery-4': 'Gallery — Dual inverters, tiered battery banks',
  'gallery-5': 'Gallery — Inverter with modular stacked batteries',
  'gallery-6': 'Gallery — Compact inverter & battery rack setup',
  'gallery-7': 'Gallery — Charge controller & inverter install',
};

function extFromMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Public: the live site fetches this on load to render any admin overrides.
    const manifest = await readJson(MANIFEST_PATH, {});
    res.status(200).json({ slots: SLOTS, overrides: manifest });
    return;
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req)) {
      res.status(401).json({ error: 'Admin session required.' });
      return;
    }

    const { slot, dataUrl } = req.body || {};
    if (!slot || !SLOTS[slot]) {
      res.status(400).json({ error: `Unknown slot "${slot}".` });
      return;
    }
    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl || '');
    if (!match) {
      res.status(400).json({ error: 'dataUrl must be a base64 image data URL.' });
      return;
    }

    const [, mime, base64] = match;
    const buffer = Buffer.from(base64, 'base64');
    const ext = extFromMime(mime);
    const pathname = `images/${slot}.${ext}`;

    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: mime,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    const manifest = await readJson(MANIFEST_PATH, {});
    manifest[slot] = { url: blob.url, updatedAt: new Date().toISOString() };
    await writeJson(MANIFEST_PATH, manifest);

    res.status(200).json({ ok: true, url: blob.url });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
