// Small helper for storing one JSON "document" (testimonials, image manifest)
// as a fixed-path file in Vercel Blob storage. Good enough for a low-traffic
// site; not built for concurrent-write safety at scale.
const { put, head } = require('@vercel/blob');

async function readJson(pathname, fallback) {
  try {
    const info = await head(pathname);
    const res = await fetch(info.url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return await res.json();
  } catch (e) {
    // Blob doesn't exist yet (or any other read failure) -> use fallback
    return fallback;
  }
}

async function writeJson(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

module.exports = { readJson, writeJson };
