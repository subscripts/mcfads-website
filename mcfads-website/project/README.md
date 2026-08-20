# Mcfads Global Link — website + admin panel

## Structure
- `index.html` — the public site (images now live in `/images`, not embedded as base64)
- `/images` — the 13 images that used to be inline base64, now static files
- `/admin` — password-gated page for the content updater (Images + Testimonials tabs)
- `/api/auth.js` — checks the shared passcode, issues a signed session token
- `/api/upload.js` — image replace/list, backed by Vercel Blob
- `/api/testimonials.js` — public submit + approved list; admin-gated pending review/approve/dismiss

## One-time setup on Vercel
1. **Enable Vercel Blob** on this project (Storage tab → Create → Blob). This
   also sets the `BLOB_READ_WRITE_TOKEN` env var automatically — no manual step.
2. **Set the admin passcode.** In Project Settings → Environment Variables, add:
   - `ADMIN_PASSCODE` — the single shared passcode the content updater will type into `/admin`.
   
   No value has been set yet — pick one and add it before sharing the `/admin` link.
3. (Optional) `AUTH_SECRET` — a separate random string for signing admin
   sessions. If you skip this, `ADMIN_PASSCODE` itself is used, which is fine
   for this project's threat model (one shared low-stakes passcode).
4. Redeploy after adding the env vars so the functions pick them up.

## Local development
```
npm install
vercel dev
```
`vercel dev` needs a Vercel account linked (`vercel link`) so it can pull the
Blob token and env vars locally.

## Access model
- **Content updater:** gets only the `/admin` URL + the shared passcode. No
  Vercel login, no GitHub, no code.
- **Anyone touching code:** add them as a Vercel Team member and/or GitHub
  collaborator instead of sharing the passcode.

## How image replacement works
Each image on the site (logo, 5 hero slides, 7 gallery shots) has a
`data-slot` attribute. On page load, the site calls `GET /api/upload`, which
returns any admin-uploaded overrides, and swaps them in — so replacing an
image in `/admin` shows up on the live site immediately, no redeploy needed.
If nothing's been uploaded for a slot, the original bundled image in
`/images` is used as the fallback.
