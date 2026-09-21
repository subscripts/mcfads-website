const { readJson, writeJson } = require('./_lib/json-blob');
const { requireAdmin } = require('./_lib/auth');
const crypto = require('crypto');

const STORE_PATH = 'data/blog.json';

function clean(str, max) {
  return String(str || '').trim().slice(0, max);
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanUrl(u) {
  const v = String(u || '').trim().slice(0, 500);
  return /^(https?:\/\/|\/)/i.test(v) ? v : '';
}

async function loadPosts() {
  const data = await readJson(STORE_PATH, []);
  return Array.isArray(data) ? data : [];
}

module.exports = async (req, res) => {
  const admin = requireAdmin(req);

  if (req.method === 'GET') {
    const posts = await loadPosts();

    if (req.query.status === 'all') {
      if (!admin) {
        res.status(401).json({ error: 'Admin session required.' });
        return;
      }
      const sorted = posts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.status(200).json(sorted);
      return;
    }

    if (req.query.slug) {
      const post = posts.find((p) => p.slug === req.query.slug && p.status === 'published');
      if (!post) {
        res.status(404).json({ error: 'Post not found.' });
        return;
      }
      res.status(200).json(post);
      return;
    }

    const published = posts
      .filter((p) => p.status === 'published')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        coverImage: p.coverImage,
        publishedAt: p.publishedAt,
      }));
    res.status(200).json(published);
    return;
  }

  if (!admin) {
    res.status(401).json({ error: 'Admin session required.' });
    return;
  }

  if (req.method === 'POST') {
    const { title, excerpt, content, coverImage, status } = req.body || {};
    const cleanTitle = clean(title, 200);
    const cleanContent = String(content || '').trim().slice(0, 50000);
    if (!cleanTitle || !cleanContent) {
      res.status(400).json({ error: 'title and content are required.' });
      return;
    }

    const posts = await loadPosts();
    const base = slugify(cleanTitle) || 'post';
    let slug = base;
    let n = 2;
    while (posts.some((p) => p.slug === slug)) {
      slug = base + '-' + n;
      n++;
    }

    const published = status === 'published';
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      slug: slug,
      excerpt: clean(excerpt, 300),
      content: cleanContent,
      coverImage: cleanUrl(coverImage),
      status: published ? 'published' : 'draft',
      createdAt: now,
      publishedAt: published ? now : null,
    };
    posts.push(record);
    await writeJson(STORE_PATH, posts);
    res.status(201).json(record);
    return;
  }

  if (req.method === 'PUT') {
    const { id, title, excerpt, content, coverImage, status } = req.body || {};
    if (!id) {
      res.status(400).json({ error: 'id is required.' });
      return;
    }

    const posts = await loadPosts();
    const post = posts.find((p) => p.id === id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }

    const wasPublished = post.status === 'published';
    if (title !== undefined) {
      const t = clean(title, 200);
      if (!t) {
        res.status(400).json({ error: 'title cannot be empty.' });
        return;
      }
      post.title = t;
    }
    if (excerpt !== undefined) post.excerpt = clean(excerpt, 300);
    if (content !== undefined) {
      const c = String(content).trim().slice(0, 50000);
      if (!c) {
        res.status(400).json({ error: 'content cannot be empty.' });
        return;
      }
      post.content = c;
    }
    if (coverImage !== undefined) post.coverImage = cleanUrl(coverImage);
    if (status !== undefined) post.status = status === 'published' ? 'published' : 'draft';

    if (post.status === 'published' && !wasPublished && !post.publishedAt) {
      post.publishedAt = new Date().toISOString();
    }
    post.updatedAt = new Date().toISOString();

    await writeJson(STORE_PATH, posts);
    res.status(200).json(post);
    return;
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) {
      res.status(400).json({ error: 'id is required.' });
      return;
    }
    const posts = await loadPosts();
    const next = posts.filter((p) => p.id !== id);
    if (next.length === posts.length) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    await writeJson(STORE_PATH, next);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};