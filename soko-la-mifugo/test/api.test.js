'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'soko-'));
process.env.DB_PATH = path.join(tmp, 'test.db');
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.ADMIN_TOKEN = 'admin-secret';
process.env.SEED = '1';

const { start, server } = require('../src/server');
let base;
let cookie = '';

async function api(method, url, body, extra = {}) {
  const headers = { 'X-Requested-With': 'soko', ...(cookie ? { Cookie: cookie } : {}), ...extra };
  let payload = body;
  if (body && !Buffer.isBuffer(body)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(base + url, { method, headers, body: payload });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json, res };
}

test.before(async () => { await start(0, '127.0.0.1'); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); setTimeout(() => process.exit(0), 50); });

test('health and config', async () => {
  assert.equal((await api('GET', '/api/health')).json.ok, true);
  const c = (await api('GET', '/api/config')).json;
  assert.equal(c.counties.length, 47);
  assert.deepEqual(c.animals, ['cattle', 'goat', 'sheep', 'chicken']);
});

test('seeded listings browse, filter and paginate without leaking phones', async () => {
  const all = (await api('GET', '/api/listings?limit=60')).json;
  assert.equal(all.total, 26);
  assert.ok(!JSON.stringify(all).includes('+254'));
  const goats = (await api('GET', '/api/listings?animal=goat&limit=60')).json;
  assert.equal(goats.total, 7);
  const meru = (await api('GET', '/api/listings?county=Meru&limit=60')).json;
  assert.ok(meru.items.every((i) => i.county === 'Meru'));
  const page = (await api('GET', '/api/listings?animal=cattle&limit=3&offset=3')).json;
  assert.equal(page.items.length, 3);
  assert.equal((await api('GET', '/api/listings?animal=dog')).status, 400);
  const stats = (await api('GET', '/api/stats?county=Kajiado')).json;
  assert.equal(stats.counts.goat, 1);
});

test('creating a listing requires sign-in and CSRF header', async () => {
  const body = { animal: 'goat', breed: 'Galla', sex: 'f', size: 1, price: 9000, county: 'Kajiado' };
  assert.equal((await api('POST', '/api/listings', body)).status, 401);
  const r = await fetch(base + '/api/listings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(r.status, 403);
});

test('phone OTP sign-in', async () => {
  assert.equal((await api('POST', '/api/auth/request', { phone: '12345' })).status, 400);
  const req = await api('POST', '/api/auth/request', { phone: '0712 345 678' });
  assert.equal(req.status, 200);
  assert.equal(req.json.phone, '+254712345678');
  assert.match(req.json.devCode, /^\d{6}$/);
  assert.equal((await api('POST', '/api/auth/request', { phone: '0712345678' })).status, 429); // cooldown
  assert.equal((await api('POST', '/api/auth/verify', { phone: '0712345678', code: '000000' })).status, 400);
  const ok = await api('POST', '/api/auth/verify', { phone: '0712345678', code: req.json.devCode, name: 'Wanjiku' });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.user.name, 'Wanjiku');
  assert.match(ok.res.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await api('GET', '/api/me')).json.user.phone, '+254712345678');
  // code cannot be reused
  assert.equal((await api('POST', '/api/auth/verify', { phone: '0712345678', code: req.json.devCode })).status, 400);
});

let listingId;
test('create, validate, photo, update, contact, my listings', async () => {
  assert.equal((await api('POST', '/api/listings', { animal: 'goat', breed: 'G', sex: 'f', size: 1, price: 9000, county: 'Kajiado' })).status, 400);
  assert.equal((await api('POST', '/api/listings', { animal: 'goat', breed: 'Galla', sex: 'f', size: 1, price: -5, county: 'Kajiado' })).status, 400);
  assert.equal((await api('POST', '/api/listings', { animal: 'goat', breed: 'Galla', sex: 'f', size: 1, price: 9000, county: 'Atlantis' })).status, 400);
  const c = await api('POST', '/api/listings', { animal: 'goat', breed: 'Galla <b>does</b>', sex: 'f', size: 1, price: 9000, quantity: 4, county: 'Kajiado' });
  assert.equal(c.status, 201);
  listingId = c.json.id;
  assert.ok(!c.json.breed.includes('<'));
  assert.equal(c.json.seller, 'Wanjiku');

  assert.equal((await api('POST', `/api/listings/${listingId}/photo`, Buffer.from('not an image'), { 'Content-Type': 'image/jpeg' })).status, 415);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
  const ph = await api('POST', `/api/listings/${listingId}/photo`, png, { 'Content-Type': 'image/png' });
  assert.equal(ph.status, 200);
  const img = await fetch(base + ph.json.photo);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');

  const up = await api('PATCH', `/api/listings/${listingId}`, { price: 9500 });
  assert.equal(up.json.price, 9500);
  const ct = await api('POST', `/api/listings/${listingId}/contact`);
  assert.equal(ct.json.phone, '+254712345678');
  assert.match(ct.json.whatsapp, /^https:\/\/wa\.me\/254712345678\?text=/);
  const mine = (await api('GET', '/api/me/listings')).json.items;
  assert.equal(mine[0].contacts, 1);
});

test('another user cannot edit or delete my listing', async () => {
  const mine = cookie;
  cookie = '';
  const r = await api('POST', '/api/auth/request', { phone: '0722000111' });
  await api('POST', '/api/auth/verify', { phone: '0722000111', code: r.json.devCode });
  assert.equal((await api('PATCH', `/api/listings/${listingId}`, { price: 1 })).status, 404);
  assert.equal((await api('DELETE', `/api/listings/${listingId}`)).status, 404);
  cookie = mine;
});

test('reports auto-flag a listing and admin can verify, remove and ban', async () => {
  const mine = cookie;
  for (const ip of ['1', '2', '3']) {
    cookie = '';
    // different "reporters": sign in as three different users
    const phone = `07220002${ip}${ip}`;
    const r = await api('POST', '/api/auth/request', { phone });
    await api('POST', '/api/auth/verify', { phone, code: r.json.devCode });
    assert.equal((await api('POST', `/api/listings/${listingId}/report`, { reason: 'scam' })).status, 200);
  }
  cookie = '';
  assert.equal((await api('GET', `/api/listings/${listingId}`)).status, 404); // flagged => hidden
  assert.equal((await api('GET', '/api/admin/reports')).status, 401);
  const A = { Authorization: 'Bearer admin-secret' };
  const reps = await api('GET', '/api/admin/reports', null, A);
  assert.equal(reps.json.items[0].reports, 3);
  assert.equal((await api('POST', `/api/admin/listings/${listingId}/status`, { status: 'active' }, A)).status, 200);
  assert.equal((await api('POST', `/api/admin/listings/${listingId}/verify`, { verified: true }, A)).status, 200);
  assert.equal((await api('GET', `/api/listings/${listingId}`)).json.verified, true);
  cookie = mine;
  const me = (await api('GET', '/api/me')).json.user;
  assert.equal((await api('POST', `/api/admin/users/${me.id}/ban`, { banned: true }, A)).status, 200);
  assert.equal((await api('GET', '/api/me')).json.user, null);
});

test('static files, traversal and unknown routes', async () => {
  cookie = '';
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.ok(home.headers.get('content-security-policy'));
  assert.equal((await fetch(base + '/..%2f..%2fpackage.json')).status, 403);
  assert.equal((await fetch(base + '/uploads/..%2f..%2fpackage.json')).status, 403);
  assert.equal((await api('GET', '/api/nope')).status, 404);
  assert.equal((await api('PUT', '/api/listings')).status, 405);
});
