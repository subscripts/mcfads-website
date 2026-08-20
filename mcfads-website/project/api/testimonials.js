const { readJson, writeJson } = require('./_lib/json-blob');
const { requireAdmin } = require('./_lib/auth');
const crypto = require('crypto');

const STORE_PATH = 'data/testimonials.json';
const EMPTY = { approved: [], pending: [] };

function sanitizeText(str, max) {
  return String(str || '').trim().slice(0, max);
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const status = req.query.status === 'pending' ? 'pending' : 'approved';

    if (status === 'pending' && !requireAdmin(req)) {
      res.status(401).json({ error: 'Admin session required.' });
      return;
    }

    const store = await readJson(STORE_PATH, EMPTY);
    res.status(200).json(store[status] || []);
    return;
  }

  if (req.method === 'POST') {
    const { name, meta, rating, text } = req.body || {};
    const cleanName = sanitizeText(name, 80);
    const cleanText = sanitizeText(text, 1000);
    const cleanRating = Math.max(1, Math.min(5, Number(rating) || 0));

    if (!cleanName || !cleanText || !cleanRating) {
      res.status(400).json({ error: 'name, text, and a 1-5 rating are required.' });
      return;
    }

    const record = {
      id: crypto.randomUUID(),
      name: cleanName,
      meta: sanitizeText(meta, 120) || 'Verified customer',
      rating: cleanRating,
      text: cleanText,
      submittedAt: new Date().toISOString(),
    };

    const store = await readJson(STORE_PATH, EMPTY);
    store.pending = store.pending || [];
    store.pending.push(record);
    await writeJson(STORE_PATH, store);

    res.status(201).json({ ok: true });
    return;
  }

  if (req.method === 'PATCH') {
    if (!requireAdmin(req)) {
      res.status(401).json({ error: 'Admin session required.' });
      return;
    }

    const { id, action } = req.body || {};
    if (!id || !['approve', 'dismiss', 'delete'].includes(action)) {
      res.status(400).json({ error: 'id and a valid action (approve, dismiss, delete) are required.' });
      return;
    }

    const store = await readJson(STORE_PATH, EMPTY);
    store.approved = store.approved || [];
    store.pending = store.pending || [];

    if (action === 'delete') {
      store.approved = store.approved.filter((t) => t.id !== id);
    } else {
      const idx = store.pending.findIndex((t) => t.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Pending testimonial not found.' });
        return;
      }
      const [record] = store.pending.splice(idx, 1);
      if (action === 'approve') {
        record.approvedAt = new Date().toISOString();
        store.approved.unshift(record);
      }
      // 'dismiss' just drops it
    }

    await writeJson(STORE_PATH, store);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
