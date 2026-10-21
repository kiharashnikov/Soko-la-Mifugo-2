'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, tx, COUNTIES, ANIMALS } = require('./db');
const { sendSms, provider: smsProvider } = require('./sms');
const { seed } = require('./seed');

const PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DAY = 86400000;
const LISTING_TTL = 60 * DAY;
const SESSION_TTL = 30 * DAY;
const OTP_TTL = 5 * 60 * 1000;
const MAX_ACTIVE_PER_USER = 20;
const MAX_PHOTO = 3 * 1024 * 1024;

// ---------- secrets ----------
function loadSecret() {
  if (process.env.APP_SECRET) return process.env.APP_SECRET;
  const f = path.join(path.dirname(process.env.DB_PATH || path.join(ROOT, 'data', 'x')), '.secret');
  try { return fs.readFileSync(f, 'utf8').trim(); } catch {}
  const s = crypto.randomBytes(32).toString('hex');
  try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s, { mode: 0o600 }); } catch {}
  return s;
}
const SECRET = loadSecret();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hmac = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// ---------- shared config ----------
const BREEDS = {
  cattle: ['Boran', 'Friesian', 'Ayrshire', 'Jersey', 'Sahiwal', 'Zebu', 'Guernsey', 'Crossbreed'],
  goat: ['Galla', 'Boer', 'Toggenburg', 'Saanen', 'Kalahari Red', 'Small East African', 'Crossbreed'],
  sheep: ['Dorper', 'Red Maasai', 'Blackhead Persian', 'Hair sheep', 'Crossbreed'],
  chicken: ['Kienyeji', 'Improved kienyeji', 'Kuroiler', 'Sasso', 'Broiler', 'Layer', 'Turkey', 'Duck']
};
const SIZE_KG = { cattle: [200, 300, 420], goat: [20, 32, 48], sheep: [20, 30, 42], chicken: [1.2, 2, 3] };
const REPORT_REASONS = ['scam', 'wrong_info', 'sold', 'other'];

// ---------- helpers ----------
class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
const bad = (m, code) => new HttpError(400, m, code || 'bad_request');

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const payload = isBuf ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': isBuf ? headers['Content-Type'] : 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers
  });
  res.end(payload);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Body too large', 'too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const ct = (req.headers['content-type'] || '').split(';')[0].trim();
  if (ct !== 'application/json') throw new HttpError(415, 'Send JSON', 'unsupported_media_type');
  const buf = await readBody(req, 20 * 1024);
  if (!buf.length) return {};
  try { const v = JSON.parse(buf.toString('utf8')); if (v && typeof v === 'object' && !Array.isArray(v)) return v; } catch {}
  throw bad('Invalid JSON', 'invalid_json');
}

function clientIp(req) {
  if (TRUST_PROXY) {
    const xf = req.headers['x-forwarded-for'];
    if (xf) return String(xf).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// in-memory fixed-window rate limiter
const buckets = new Map();
function hit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  return b.n <= max;
}
function limit(req, name, max, windowMs) {
  if (!hit(`${name}:${clientIp(req)}`, max, windowMs)) throw new HttpError(429, 'Too many requests. Try again later.', 'rate_limited');
}
setInterval(() => { const n = Date.now(); for (const [k, b] of buckets) if (b.reset < n) buckets.delete(k); }, 60000).unref();

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function currentUser(req) {
  const token = parseCookies(req).sid;
  if (!token) return null;
  const row = db.prepare(`SELECT u.id, u.phone, u.name, u.banned FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(sha(token), Date.now());
  return row && !row.banned ? row : null;
}
function requireUser(req) {
  const u = currentUser(req);
  if (!u) throw new HttpError(401, 'Please sign in', 'unauthorized');
  return u;
}
function csrf(req) {
  if (req.headers['x-requested-with'] !== 'soko') throw new HttpError(403, 'Missing request header', 'csrf');
}
function requireAdmin(req) {
  const t = process.env.ADMIN_TOKEN;
  if (!t) throw new HttpError(404, 'Not found', 'not_found');
  const h = String(req.headers.authorization || '');
  if (!h.startsWith('Bearer ') || !safeEq(h.slice(7), t)) throw new HttpError(401, 'Admin token required', 'unauthorized');
}

function normalizePhone(input) {
  let p = String(input || '').replace(/[\s\-().]/g, '');
  if (/^\+254[17]\d{8}$/.test(p)) return p;
  if (/^254[17]\d{8}$/.test(p)) return '+' + p;
  if (/^0[17]\d{8}$/.test(p)) return '+254' + p.slice(1);
  if (/^[17]\d{8}$/.test(p)) return '+254' + p;
  throw bad('Enter a valid Kenyan phone number, e.g. 0712 345 678', 'invalid_phone');
}
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

function publicListing(r) {
  return {
    id: r.id, animal: r.animal, breed: r.breed, sex: r.sex, size: r.size, kg: SIZE_KG[r.animal][r.size],
    price: r.price, quantity: r.quantity, county: r.county, description: r.description,
    photo: r.photo, verified: !!r.verified, vaccinated: !!r.vaccinated,
    seller: r.seller || '', created_at: r.created_at
  };
}
const LISTING_SELECT = `SELECT l.*, u.name AS seller FROM listings l JOIN users u ON u.id = l.user_id`;

// ---------- validation ----------
function validateListing(b, partial = false) {
  const o = {};
  const need = (k) => { if (!partial && b[k] === undefined) throw bad(`Missing ${k}`, 'missing_' + k); return b[k] !== undefined; };
  if (need('animal')) { if (!ANIMALS.includes(b.animal)) throw bad('Unknown animal', 'invalid_animal'); o.animal = b.animal; }
  if (need('breed')) { o.breed = clean(b.breed, 60); if (o.breed.length < 2) throw bad('Breed is too short', 'invalid_breed'); }
  if (need('sex')) { if (!['m', 'f'].includes(b.sex)) throw bad('Sex must be m or f', 'invalid_sex'); o.sex = b.sex; }
  if (need('size')) { const s = Number(b.size); if (![0, 1, 2].includes(s)) throw bad('Size must be 0, 1 or 2', 'invalid_size'); o.size = s; }
  if (need('price')) { const p = Number(b.price); if (!Number.isInteger(p) || p < 50 || p > 5000000) throw bad('Price must be between KES 50 and 5,000,000', 'invalid_price'); o.price = p; }
  if (b.quantity !== undefined) { const q = Number(b.quantity); if (!Number.isInteger(q) || q < 1 || q > 500) throw bad('Quantity must be 1 to 500', 'invalid_quantity'); o.quantity = q; }
  if (need('county')) { if (!COUNTIES.includes(b.county)) throw bad('Unknown county', 'invalid_county'); o.county = b.county; }
  if (b.vaccinated !== undefined) o.vaccinated = b.vaccinated ? 1 : 0;
  if (b.description !== undefined) o.description = clean(b.description, 300);
  return o;
}

// ---------- route handlers ----------
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, re: new RegExp('^' + pattern + '$'), handler });

route('GET', '/api/health', () => ({ ok: true, time: Date.now() }));

route('GET', '/api/config', () => ({
  animals: ANIMALS, counties: COUNTIES, breeds: BREEDS, sizeKg: SIZE_KG,
  smsDev: !PROD && smsProvider === 'console'
}));

route('GET', '/api/stats', (req, res, m, url) => {
  const county = url.searchParams.get('county') || '';
  const args = [Date.now()];
  let where = `status='active' AND expires_at > ?`;
  if (county) { where += ' AND county = ?'; args.push(county); }
  const rows = db.prepare(`SELECT animal, COUNT(*) n FROM listings WHERE ${where} GROUP BY animal`).all(...args);
  const counts = Object.fromEntries(ANIMALS.map((a) => [a, 0]));
  for (const r of rows) counts[r.animal] = r.n;
  return { counts };
});

route('GET', '/api/listings', (req, res, m, url) => {
  limit(req, 'browse', 240, 60000);
  const q = url.searchParams;
  const where = [`l.status='active'`, 'l.expires_at > ?'];
  const args = [Date.now()];
  const animal = q.get('animal');
  if (animal) { if (!ANIMALS.includes(animal)) throw bad('Unknown animal'); where.push('l.animal = ?'); args.push(animal); }
  const county = q.get('county');
  if (county) { where.push('l.county = ?'); args.push(county); }
  const sex = q.get('sex');
  if (sex) { if (!['m', 'f'].includes(sex)) throw bad('Bad sex'); where.push('l.sex = ?'); args.push(sex); }
  const min = q.get('min_price'), max = q.get('max_price');
  if (min && Number.isFinite(+min)) { where.push('l.price >= ?'); args.push(+min); }
  if (max && Number.isFinite(+max)) { where.push('l.price <= ?'); args.push(+max); }
  if (q.get('verified') === '1') where.push('l.verified = 1');
  const term = clean(q.get('q'), 40).replace(/[%_]/g, '');
  if (term) { where.push('l.breed LIKE ?'); args.push(`%${term}%`); }
  const sorts = { new: 'l.created_at DESC', price_asc: 'l.price ASC', price_desc: 'l.price DESC' };
  const order = sorts[q.get('sort')] || 'l.verified DESC, l.created_at DESC';
  const limitN = Math.min(Math.max(parseInt(q.get('limit') || '12', 10) || 12, 1), 60);
  const offset = Math.max(parseInt(q.get('offset') || '0', 10) || 0, 0);
  const total = db.prepare(`SELECT COUNT(*) n FROM listings l WHERE ${where.join(' AND ')}`).get(...args).n;
  const rows = db.prepare(`${LISTING_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args, limitN, offset);
  return { total, items: rows.map(publicListing) };
});

route('GET', '/api/listings/(\\d+)', (req, res, m) => {
  const r = db.prepare(`${LISTING_SELECT} WHERE l.id = ? AND l.status IN ('active','sold') AND l.expires_at > ?`).get(+m[1], Date.now());
  if (!r) throw new HttpError(404, 'Listing not found', 'not_found');
  return { ...publicListing(r), status: r.status };
});

route('POST', '/api/listings', async (req) => {
  csrf(req); limit(req, 'create', 30, 3600000);
  const user = requireUser(req);
  const o = validateListing(await readJson(req));
  const active = db.prepare(`SELECT COUNT(*) n FROM listings WHERE user_id=? AND status='active' AND expires_at>?`).get(user.id, Date.now()).n;
  if (active >= MAX_ACTIVE_PER_USER) throw new HttpError(409, `You can have up to ${MAX_ACTIVE_PER_USER} active listings`, 'limit_reached');
  const now = Date.now();
  const id = Number(db.prepare(`INSERT INTO listings (user_id,animal,breed,sex,size,price,quantity,county,description,vaccinated,created_at,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(user.id, o.animal, o.breed, o.sex, o.size, o.price, o.quantity || 1, o.county,
    o.description || '', o.vaccinated || 0, now, now + LISTING_TTL).lastInsertRowid);
  const r = db.prepare(`${LISTING_SELECT} WHERE l.id=?`).get(id);
  return [201, publicListing(r)];
});

route('PATCH', '/api/listings/(\\d+)', async (req, res, m) => {
  csrf(req);
  const user = requireUser(req);
  const row = db.prepare('SELECT * FROM listings WHERE id=? AND user_id=?').get(+m[1], user.id);
  if (!row || row.status === 'removed') throw new HttpError(404, 'Listing not found', 'not_found');
  const b = await readJson(req);
  const o = validateListing(b, true);
  if (b.status !== undefined) {
    if (!['active', 'sold'].includes(b.status)) throw bad('Status must be active or sold', 'invalid_status');
    if (row.status === 'flagged') throw new HttpError(409, 'This listing is under review', 'flagged');
    o.status = b.status;
  }
  const keys = Object.keys(o);
  if (!keys.length) throw bad('Nothing to update', 'empty');
  db.prepare(`UPDATE listings SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`).run(...keys.map((k) => o[k]), row.id);
  return publicListing(db.prepare(`${LISTING_SELECT} WHERE l.id=?`).get(row.id));
});

route('DELETE', '/api/listings/(\\d+)', (req, res, m) => {
  csrf(req);
  const user = requireUser(req);
  const row = db.prepare('SELECT id, photo FROM listings WHERE id=? AND user_id=?').get(+m[1], user.id);
  if (!row) throw new HttpError(404, 'Listing not found', 'not_found');
  db.prepare(`UPDATE listings SET status='removed', photo=NULL WHERE id=?`).run(row.id);
  removeUpload(row.photo);
  return { ok: true };
});

function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const f = path.join(UPLOAD_DIR, path.basename(url));
  fs.rm(f, { force: true }, () => {});
}
function sniffImage(b) {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
route('POST', '/api/listings/(\\d+)/photo', async (req, res, m) => {
  csrf(req); limit(req, 'photo', 60, 3600000);
  const user = requireUser(req);
  const row = db.prepare(`SELECT id, photo FROM listings WHERE id=? AND user_id=? AND status!='removed'`).get(+m[1], user.id);
  if (!row) throw new HttpError(404, 'Listing not found', 'not_found');
  const body = await readBody(req, MAX_PHOTO);
  const ext = sniffImage(body);
  if (!ext) throw new HttpError(415, 'Photo must be a JPEG, PNG or WebP image', 'unsupported_media_type');
  const name = `${row.id}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), body);
  db.prepare('UPDATE listings SET photo=? WHERE id=?').run('/uploads/' + name, row.id);
  removeUpload(row.photo);
  return { photo: '/uploads/' + name };
});

route('POST', '/api/listings/(\\d+)/contact', (req, res, m) => {
  csrf(req); limit(req, 'contact', 40, 600000);
  const r = db.prepare(`SELECT l.id, l.breed, u.phone FROM listings l JOIN users u ON u.id=l.user_id
    WHERE l.id=? AND l.status='active' AND l.expires_at>?`).get(+m[1], Date.now());
  if (!r) throw new HttpError(404, 'Listing not found', 'not_found');
  db.prepare('UPDATE listings SET contacts = contacts + 1 WHERE id=?').run(r.id);
  const text = encodeURIComponent(`Hello, I saw your ${r.breed} on Soko la Mifugo. Is it still available?`);
  return {
    phone: r.phone, tel: `tel:${r.phone}`,
    whatsapp: `https://wa.me/${r.phone.replace('+', '')}?text=${text}`,
    demo: r.phone.startsWith('+254700000')
  };
});

route('POST', '/api/listings/(\\d+)/report', async (req, res, m) => {
  csrf(req); limit(req, 'report', 20, 3600000);
  const b = await readJson(req);
  const reason = REPORT_REASONS.includes(b.reason) ? b.reason : 'other';
  const r = db.prepare(`SELECT id FROM listings WHERE id=? AND status IN ('active','flagged')`).get(+m[1]);
  if (!r) throw new HttpError(404, 'Listing not found', 'not_found');
  const who = currentUser(req);
  const reporter = hmac(who ? 'u' + who.id : 'ip' + clientIp(req));
  db.prepare('INSERT OR IGNORE INTO reports(listing_id,reason,reporter_hash,created_at) VALUES (?,?,?,?)').run(r.id, reason, reporter, Date.now());
  const n = db.prepare('SELECT COUNT(*) n FROM reports WHERE listing_id=?').get(r.id).n;
  if (n >= 3) db.prepare(`UPDATE listings SET status='flagged' WHERE id=? AND status='active'`).run(r.id);
  return { ok: true };
});

// ----- auth -----
route('POST', '/api/auth/request', async (req) => {
  csrf(req); limit(req, 'otp-ip', 10, 3600000);
  const b = await readJson(req);
  const phone = normalizePhone(b.phone);
  const now = Date.now();
  const recent = db.prepare('SELECT created_at FROM otps WHERE phone=? AND created_at > ? ORDER BY created_at DESC').all(phone, now - 600000);
  if (recent.length >= 3) throw new HttpError(429, 'Too many codes requested. Wait a few minutes.', 'rate_limited');
  if (recent[0] && now - recent[0].created_at < 30000) throw new HttpError(429, 'Wait 30 seconds before asking for another code.', 'rate_limited');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  db.prepare('INSERT INTO otps(phone,code_hash,expires_at,created_at) VALUES (?,?,?,?)').run(phone, hmac(code + phone), now + OTP_TTL, now);
  try { await sendSms(phone, `Soko la Mifugo code: ${code}. It expires in 5 minutes. Do not share it.`); }
  catch (e) { console.error('SMS failed:', e.message); throw new HttpError(502, 'Could not send the SMS. Try again.', 'sms_failed'); }
  const out = { ok: true, phone };
  if (!PROD && smsProvider === 'console') out.devCode = code; // convenience for local development only
  return out;
});

route('POST', '/api/auth/verify', async (req, res) => {
  csrf(req); limit(req, 'verify-ip', 30, 3600000);
  const b = await readJson(req);
  const phone = normalizePhone(b.phone);
  const code = String(b.code || '').replace(/\D/g, '');
  const now = Date.now();
  const otp = db.prepare('SELECT * FROM otps WHERE phone=? AND used=0 AND expires_at>? ORDER BY created_at DESC LIMIT 1').get(phone, now);
  if (!otp || otp.attempts >= 5) throw new HttpError(400, 'Code expired. Ask for a new one.', 'code_expired');
  db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE id=?').run(otp.id);
  if (code.length !== 6 || !safeEq(hmac(code + phone), otp.code_hash)) throw new HttpError(400, 'Wrong code. Check the SMS and try again.', 'wrong_code');
  const name = clean(b.name, 40);
  const token = crypto.randomBytes(32).toString('hex');
  const user = tx(() => {
    db.prepare('UPDATE otps SET used=1 WHERE id=?').run(otp.id);
    let u = db.prepare('SELECT * FROM users WHERE phone=?').get(phone);
    if (!u) {
      const id = Number(db.prepare('INSERT INTO users(phone,name,created_at) VALUES (?,?,?)').run(phone, name, now).lastInsertRowid);
      u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
    } else if (!u.name && name) {
      db.prepare('UPDATE users SET name=? WHERE id=?').run(name, u.id);
      u.name = name;
    }
    if (u.banned) throw new HttpError(403, 'This account is suspended', 'banned');
    db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run(sha(token), u.id, now + SESSION_TTL, now);
    return u;
  });
  const cookie = `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}` +
    (PROD || process.env.COOKIE_SECURE === '1' ? '; Secure' : '');
  return [200, { user: { id: user.id, name: user.name, phone: user.phone } }, { 'Set-Cookie': cookie }];
});

route('POST', '/api/auth/logout', (req) => {
  csrf(req);
  const token = parseCookies(req).sid;
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(token));
  return [200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' }];
});

route('GET', '/api/me', (req) => {
  const u = currentUser(req);
  return { user: u ? { id: u.id, name: u.name, phone: u.phone } : null };
});

route('PATCH', '/api/me', async (req) => {
  csrf(req);
  const u = requireUser(req);
  const b = await readJson(req);
  const name = clean(b.name, 40);
  db.prepare('UPDATE users SET name=? WHERE id=?').run(name, u.id);
  return { user: { id: u.id, name, phone: u.phone } };
});

route('GET', '/api/me/listings', (req) => {
  const u = requireUser(req);
  const rows = db.prepare(`${LISTING_SELECT} WHERE l.user_id=? AND l.status!='removed' ORDER BY l.created_at DESC LIMIT 100`).all(u.id);
  return { items: rows.map((r) => ({ ...publicListing(r), status: r.status, contacts: r.contacts, expires_at: r.expires_at })) };
});

// ----- admin (enabled only when ADMIN_TOKEN is set) -----
route('GET', '/api/admin/reports', (req) => {
  requireAdmin(req);
  const rows = db.prepare(`SELECT l.id, l.breed, l.animal, l.county, l.price, l.status, l.verified, u.id AS user_id, u.phone,
      COUNT(r.id) AS reports, GROUP_CONCAT(r.reason) AS reasons
    FROM reports r JOIN listings l ON l.id=r.listing_id JOIN users u ON u.id=l.user_id
    GROUP BY l.id ORDER BY reports DESC, l.created_at DESC LIMIT 100`).all();
  return { items: rows };
});
route('POST', '/api/admin/listings/(\\d+)/verify', async (req, res, m) => {
  requireAdmin(req);
  const b = await readJson(req);
  const r = db.prepare('UPDATE listings SET verified=? WHERE id=?').run(b.verified === false ? 0 : 1, +m[1]);
  if (!r.changes) throw new HttpError(404, 'Listing not found', 'not_found');
  return { ok: true };
});
route('POST', '/api/admin/listings/(\\d+)/status', async (req, res, m) => {
  requireAdmin(req);
  const b = await readJson(req);
  if (!['active', 'removed', 'flagged'].includes(b.status)) throw bad('Bad status');
  const r = db.prepare('UPDATE listings SET status=? WHERE id=?').run(b.status, +m[1]);
  if (!r.changes) throw new HttpError(404, 'Listing not found', 'not_found');
  return { ok: true };
});
route('POST', '/api/admin/users/(\\d+)/ban', async (req, res, m) => {
  requireAdmin(req);
  const b = await readJson(req);
  const banned = b.banned === false ? 0 : 1;
  const r = db.prepare('UPDATE users SET banned=? WHERE id=?').run(banned, +m[1]);
  if (!r.changes) throw new HttpError(404, 'User not found', 'not_found');
  if (banned) {
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(+m[1]);
    db.prepare(`UPDATE listings SET status='removed' WHERE user_id=? AND status='active'`).run(+m[1]);
  }
  return { ok: true };
});

// ---------- static files ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8'
};
function serveStatic(req, res, pathname) {
  let base = PUBLIC_DIR, rel = pathname;
  if (pathname.startsWith('/uploads/')) { base = UPLOAD_DIR; rel = pathname.slice('/uploads'.length); }
  if (rel === '/' || rel === '') rel = '/index.html';
  let file;
  try { file = path.join(base, decodeURIComponent(rel)); } catch { return send(res, 400, { error: 'Bad path' }); }
  if (!file.startsWith(base + path.sep)) return send(res, 403, { error: 'Forbidden' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, { error: 'Not found' });
    const ext = path.extname(file).toLowerCase();
    const upload = base === UPLOAD_DIR;
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': upload ? 'public, max-age=2592000, immutable' : ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

// ---------- server ----------
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
if (PROD) SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';

const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  const started = Date.now();
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return send(res, 400, { error: 'Bad URL' }); }
  const pathname = url.pathname;
  res.on('finish', () => { if (pathname.startsWith('/api/')) console.log(`${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`); });

  try {
    if (pathname.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = pathname.match(r.re);
        if (!m) continue;
        let out = await r.handler(req, res, m, url);
        let status = 200, headers = {};
        if (Array.isArray(out)) [status, out, headers = {}] = out;
        return send(res, status, out, headers);
      }
      if (routes.some((r) => r.re.test(pathname))) throw new HttpError(405, 'Method not allowed', 'method_not_allowed');
      throw new HttpError(404, 'Not found', 'not_found');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed', 'method_not_allowed');
    serveStatic(req, res, pathname);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e instanceof HttpError) return send(res, e.status, { error: e.message, code: e.code });
    console.error(e);
    send(res, 500, { error: 'Something went wrong', code: 'server_error' });
  }
});
server.requestTimeout = 30000;

function cleanup() {
  const now = Date.now();
  db.prepare('DELETE FROM otps WHERE expires_at < ?').run(now - DAY);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  const gone = db.prepare(`SELECT id, photo FROM listings WHERE (expires_at < ? AND status='active') OR (status IN ('sold','removed') AND created_at < ?)`).all(now - 7 * DAY, now - 90 * DAY);
  for (const g of gone) { removeUpload(g.photo); db.prepare('DELETE FROM listings WHERE id=?').run(g.id); }
}

function start(port = PORT, host = HOST) {
  if (process.env.SEED === '1') { const n = seed(); if (n) console.log(`Seeded ${n} demo listings`); }
  cleanup();
  setInterval(cleanup, 6 * 3600000).unref();
  return new Promise((resolve) => server.listen(port, host, () => {
    console.log(`Soko la Mifugo running on http://${host === '0.0.0.0' ? 'localhost' : host}:${server.address().port} (sms=${smsProvider}${PROD ? ', production' : ''})`);
    resolve(server);
  }));
}

if (require.main === module) {
  start();
  const stop = () => server.close(() => { try { db.close(); } catch {} process.exit(0); });
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}

module.exports = { server, start };
