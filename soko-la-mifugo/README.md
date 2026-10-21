# Soko la Mifugo

Livestock marketplace for Kenya. Buyers browse cattle, goats, sheep and chickens by county and call or WhatsApp the seller. Sellers sign in with their phone (SMS code) and post in six taps, with an optional photo. English and Swahili, voice prompts, built for low-end phones.

**No dependencies.** Node 22.13+ only (uses the built-in `node:sqlite`). Nothing to `npm install`.

## Run it

```bash
SEED=1 npm start        # http://localhost:3000, with 26 demo listings
npm test                # 8 API tests (temp database)
```

In development the SMS code is printed in the server log and pre-filled in the sign-in screen. Demo sellers use fake numbers (+254700000xxx), so Call/WhatsApp on a demo listing shows a "sample listing" notice instead of dialling.

## What is inside

| Part | Where |
|---|---|
| UI (your design, now live) | `public/index.html`, `public/app.js` |
| REST API + static server | `src/server.js` |
| SQLite schema (auto-created) | `src/db.js` |
| Demo data | `src/seed.js` |
| SMS (console or Africa's Talking) | `src/sms.js` |
| Tests | `test/api.test.js` |

### Database
`users` (phone, name, banned) · `otps` (hashed codes, expiry, attempts) · `sessions` (hashed tokens) · `listings` (animal, breed, sex, size, price each, quantity, county, photo, verified, vaccinated, status: active/sold/removed/flagged, contacts, 60-day expiry) · `reports` · `counties` (all 47).

### API
Mutating requests need the header `X-Requested-With: soko` (CSRF guard) and a JSON body.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/config` | counties, breeds, size weights |
| GET | `/api/stats?county=` | counts per animal |
| GET | `/api/listings` | `animal, county, sex, min_price, max_price, verified=1, q, sort=new\|price_asc\|price_desc, limit<=60, offset`. Never returns phone numbers |
| GET | `/api/listings/:id` | |
| POST | `/api/listings` | sign-in required; max 20 active per seller |
| PATCH / DELETE | `/api/listings/:id` | owner only; PATCH `{status:"sold"}`, price, etc. |
| POST | `/api/listings/:id/photo` | raw image body (JPEG/PNG/WebP, 3 MB, magic-byte checked) |
| POST | `/api/listings/:id/contact` | returns phone, `tel:` and WhatsApp link; counts the lead; rate limited |
| POST | `/api/listings/:id/report` | `{reason: scam\|wrong_info\|sold\|other}`; 3 reports auto-hide a listing |
| POST | `/api/auth/request` | `{phone}` sends a 6-digit code (3 per 10 min per phone) |
| POST | `/api/auth/verify` | `{phone, code, name?}` sets an HttpOnly session cookie (30 days) |
| POST | `/api/auth/logout`, GET/PATCH `/api/me`, GET `/api/me/listings` | |
| GET | `/api/admin/reports` | `Authorization: Bearer $ADMIN_TOKEN` |
| POST | `/api/admin/listings/:id/verify` `{verified}` · `/status` `{status}` · `/api/admin/users/:id/ban` `{banned}` | |

Admin example: `curl -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -H "X-Requested-With: soko" -d '{"verified":true}' https://your-site/api/admin/listings/12/verify`

## Go live

1. **SMS.** Create an [Africa's Talking](https://africastalking.com) account, set `SMS_PROVIDER=africastalking`, `AT_USERNAME`, `AT_API_KEY` (use username `sandbox` first). Without this, nobody can sign in once `NODE_ENV=production`.
2. **Host.** Any host that runs Node or Docker with a **persistent volume** (database and photos live on disk): Fly.io, Railway, Render, or a VPS.
   ```bash
   docker build -t soko .
   docker run -d -p 3000:3000 -v soko-data:/data --env-file .env soko
   ```
3. **HTTPS** in front (Caddy, nginx, or your host's proxy) and set `TRUST_PROXY=1`. Cookies are Secure in production.
4. Set `APP_SECRET` and `ADMIN_TOKEN` to long random values. Do not set `SEED`.
5. Back up the `/data` volume (the `.db` file plus `uploads/`).

## Known limits (by design, for a first version)

- One server instance: SQLite plus an in-memory rate limiter. Fine for tens of thousands of listings; move to Postgres and Redis before running several instances.
- Photos are stored on local disk. Move to object storage (S3, R2) if you outgrow one disk.
- "Verified" is set by you via the admin API. Decide your own verification process (visit, ID check, vet certificate) before showing the badge to real sellers.
- Listing text is sanitised and escaped, but there is no moderation queue UI yet.
