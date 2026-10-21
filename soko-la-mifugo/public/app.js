'use strict';
const AN = ['cattle', 'goat', 'sheep', 'chicken'];
const STEP = { cattle: 5000, goat: 500, sheep: 500, chicken: 100 };
const PRE = { cattle: [40000, 80000, 120000], goat: [6000, 12000, 20000], sheep: [6000, 10000, 16000], chicken: [600, 1200, 2500] };
const QPRE = [1, 5, 10, 20, 50];
const PAGE = 12;

const L = {
  en: {
    h1: 'Buy and sell livestock near you', lead: 'Choose a kind of animal to see what is for sale.', sell: 'Sell', all: 'All',
    anywhere: 'Anywhere in Kenya', n: { cattle: 'Cattle', goat: 'Goats', sheep: 'Sheep', chicken: 'Chickens' },
    one: { cattle: 'Cow or bull', goat: 'Goat', sheep: 'Sheep', chicken: 'Chicken' },
    male: 'Male', female: 'Female', sm: 'Small', md: 'Medium', lg: 'Large',
    q_animal: 'What are you selling?', q_breed: 'Which breed?', q_sex: 'Male or female?', q_size: 'How big is it?', q_qty: 'How many?',
    q_price: 'What price in KES?', q_county: 'Where is it?', q_photo: 'Add a photo', q_phone: 'Sign in with your phone', q_review: 'Check and post',
    next: 'Next', back: 'Back', post: 'Post', call: 'Call', wa: 'WhatsApp', safe: 'See the animal before you pay any deposit.',
    ver: 'Verified', vac: 'Vaccinated', done: 'Posted! Buyers can now see it.', view: 'See it', none: 'Nothing here yet. Be the first to sell.',
    sex: 'Sex', size: 'Size', wt: 'Weight', loc: 'Where', seller: 'Seller', items: 'for sale', posted: 'Posted',
    signin: 'Sign in', mine: 'My animals', each: 'each', perEach: 'Price for each animal',
    photoHelp: 'A clear photo helps you sell faster. You can skip this.', takePhoto: 'Take or choose a photo', skip: 'Skip',
    yourPhone: 'Phone number', yourName: 'Your name (optional)', sendCode: 'Send code', verify: 'Verify',
    resend: 'Send a new code', sentTo: 'We sent a 6-digit code to', why: 'Buyers will call this number. We also use it to stop fake sellers.',
    today: 'Today', daysAgo: 'days ago', more: 'Show more', report: 'Report this listing', reportQ: 'What is wrong?',
    r_scam: 'Looks like a scam', r_wrong_info: 'Wrong details', r_sold: 'Already sold', r_other: 'Something else',
    thanks: 'Thank you. We will check it.', demo: 'This is a sample listing, so the phone number is not real.',
    offline: 'No internet. Check your connection and try again.', oops: 'Something went wrong. Try again.', retry: 'Try again',
    sold: 'Mark as sold', reopen: 'Put back on sale', del: 'Delete', contacts: 'contacts', flagged: 'Under review',
    st_active: 'For sale', st_sold: 'Sold', logout: 'Sign out', nomine: 'You have not posted anything yet.',
    confirmDel: 'Delete this listing?', photoFail: 'Posted, but the photo could not be uploaded.', close: 'Close', listen: 'Listen',
    err: {}
  },
  sw: {
    h1: 'Nunua na uza mifugo karibu nawe', lead: 'Chagua aina ya mnyama uone kinachouzwa.', sell: 'Uza', all: 'Wote',
    anywhere: 'Popote Kenya', n: { cattle: 'Ng’ombe', goat: 'Mbuzi', sheep: 'Kondoo', chicken: 'Kuku' },
    one: { cattle: 'Ng’ombe', goat: 'Mbuzi', sheep: 'Kondoo', chicken: 'Kuku' },
    male: 'Dume', female: 'Jike', sm: 'Ndogo', md: 'Wastani', lg: 'Kubwa',
    q_animal: 'Unauza nini?', q_breed: 'Ni aina gani?', q_sex: 'Dume au jike?', q_size: 'Ukubwa gani?', q_qty: 'Ni wangapi?',
    q_price: 'Bei gani (KES)?', q_county: 'Iko wapi?', q_photo: 'Weka picha', q_phone: 'Ingia kwa simu yako', q_review: 'Hakiki kisha tuma',
    next: 'Endelea', back: 'Rudi', post: 'Tuma', call: 'Piga simu', wa: 'WhatsApp', safe: 'Ona mnyama kabla ya kutuma amana yoyote.',
    ver: 'Amethibitishwa', vac: 'Amechanjwa', done: 'Imetumwa! Wanunuzi sasa wanaweza kuona.', view: 'Tazama', none: 'Hakuna kitu bado. Kuwa wa kwanza kuuza.',
    sex: 'Jinsia', size: 'Ukubwa', wt: 'Uzito', loc: 'Mahali', seller: 'Muuzaji', items: 'zinauzwa', posted: 'Imetangazwa',
    signin: 'Ingia', mine: 'Mifugo yangu', each: 'kila mmoja', perEach: 'Bei ya kila mnyama',
    photoHelp: 'Picha safi inakusaidia kuuza haraka. Unaweza kuruka hatua hii.', takePhoto: 'Piga au chagua picha', skip: 'Ruka',
    yourPhone: 'Namba ya simu', yourName: 'Jina lako (si lazima)', sendCode: 'Tuma nambari', verify: 'Thibitisha',
    resend: 'Tuma nambari mpya', sentTo: 'Tumetuma nambari ya tarakimu 6 kwa', why: 'Wanunuzi watapiga namba hii. Tunaitumia pia kuzuia wauzaji bandia.',
    today: 'Leo', daysAgo: 'siku zilizopita', more: 'Onyesha zaidi', report: 'Ripoti tangazo hili', reportQ: 'Kuna shida gani?',
    r_scam: 'Inaonekana ni ulaghai', r_wrong_info: 'Maelezo si sahihi', r_sold: 'Imeshauzwa', r_other: 'Jambo lingine',
    thanks: 'Asante. Tutakagua.', demo: 'Hili ni tangazo la mfano, kwa hiyo namba si halisi.',
    offline: 'Hakuna intaneti. Angalia muunganisho kisha jaribu tena.', oops: 'Kuna hitilafu. Jaribu tena.', retry: 'Jaribu tena',
    sold: 'Weka kama imeuzwa', reopen: 'Rudisha sokoni', del: 'Futa', contacts: 'waliowasiliana', flagged: 'Inakaguliwa',
    st_active: 'Inauzwa', st_sold: 'Imeuzwa', logout: 'Toka', nomine: 'Hujatuma tangazo lolote bado.',
    confirmDel: 'Futa tangazo hili?', photoFail: 'Imetumwa, lakini picha haikupakiwa.', close: 'Funga', listen: 'Sikiliza',
    err: {
      invalid_phone: 'Weka namba sahihi ya Kenya, mfano 0712 345 678', wrong_code: 'Nambari si sahihi. Angalia SMS kisha jaribu tena.',
      code_expired: 'Nambari imeisha muda. Omba mpya.', rate_limited: 'Maombi mengi mno. Subiri kidogo kisha jaribu tena.',
      unauthorized: 'Tafadhali ingia kwanza.', sms_failed: 'SMS haikutumwa. Jaribu tena.'
    }
  }
};

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kes = (n) => Number(n).toLocaleString('en-KE');
const ic = (a) => `<svg class="ic"><use href="#i-${a}"/></svg>`;

const st = { f: null, county: '', lang: 'en', user: null, counts: {}, lists: {}, loading: false, err: '' };
let CFG = { counties: [], breeds: {}, sizeKg: { cattle: [200, 300, 420], goat: [20, 32, 48], sheep: [20, 30, 42], chicken: [1.2, 2, 3] } };
try { const l = localStorage.getItem('lang'); if (l === 'sw' || l === 'en') st.lang = l; } catch {}
const t = (k) => L[st.lang][k] ?? L.en[k] ?? k;

function errMsg(e) {
  if (st.lang === 'sw' && e.code && L.sw.err[e.code]) return L.sw.err[e.code];
  return e.message || t('oops');
}

async function api(method, url, body) {
  const headers = { 'X-Requested-With': 'soko' };
  let payload;
  if (body instanceof Blob) { headers['Content-Type'] = body.type; payload = body; }
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(url, { method, headers, body: payload, credentials: 'same-origin' }); }
  catch { throw new Error(t('offline')); }
  let j = null; try { j = await res.json(); } catch {}
  if (!res.ok) { const e = new Error((j && j.error) || t('oops')); e.status = res.status; e.code = j && j.code; throw e; }
  return j;
}

function say(x) {
  try { const u = new SpeechSynthesisUtterance(x); u.lang = st.lang === 'sw' ? 'sw-KE' : 'en-KE'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
}
const ago = (ms) => { const d = Math.floor((Date.now() - ms) / 864e5); return d <= 0 ? t('today') : `${d} ${t('daysAgo')}`; };
const kgOf = (a, sz) => CFG.sizeKg[a][sz];

// ---------- data ----------
async function loadStats() {
  const q = st.county ? '?county=' + encodeURIComponent(st.county) : '';
  st.counts = (await api('GET', '/api/stats' + q)).counts;
}
async function loadAnimal(a, more) {
  const cur = st.lists[a] || { items: [], total: 0 };
  const p = new URLSearchParams({ animal: a, limit: PAGE, offset: more ? cur.items.length : 0 });
  if (st.county) p.set('county', st.county);
  const r = await api('GET', '/api/listings?' + p);
  st.lists[a] = { items: more ? cur.items.concat(r.items) : r.items, total: r.total };
}
async function refresh() {
  st.loading = true; st.err = ''; render();
  try { await Promise.all([loadStats(), ...AN.filter((a) => !st.f || a === st.f).map((a) => loadAnimal(a))]); }
  catch (e) { st.err = errMsg(e); }
  st.loading = false; render();
}
const findItem = (id) => { for (const a of AN) { const f = (st.lists[a]?.items || []).find((i) => i.id === id); if (f) return f; } return null; };

// ---------- main render ----------
function card(d) {
  const media = d.photo ? `<img src="${esc(d.photo)}" alt="" loading="lazy">` : ic(d.animal);
  return `<button class="card" data-act="card" data-id="${d.id}" aria-label="${esc(d.breed)}, KES ${kes(d.price)}">
    <div class="img">${d.verified ? `<span class="vf">✓ ${t('ver')}</span>` : ''}${d.quantity > 1 ? `<span class="qty">×${d.quantity}</span>` : ''}${media}</div>
    <div class="tx"><b>${esc(d.breed)}</b><span>${esc(d.county)}</span><span class="pr">KES ${kes(d.price)}${d.quantity > 1 ? ` <small style="font:700 13px var(--sans);color:var(--mut)">${t('each')}</small>` : ''}</span></div></button>`;
}

function render() {
  document.documentElement.lang = st.lang;
  $('#h1').textContent = t('h1'); $('#lead').textContent = t('lead');
  $('#sellTop').innerHTML = '＋ ' + t('sell');
  $('#lang').textContent = st.lang === 'en' ? 'SW' : 'EN';
  $('#acct').textContent = st.user ? '👤 ' + (st.user.name ? st.user.name.split(' ')[0] : st.user.phone.slice(-4)) : t('signin');

  $('#tabs').innerHTML = `<button data-act="tab" data-a="" class="${st.f ? '' : 'on'}" style="padding-left:18px">${t('all')}</button>` +
    AN.map((a) => `<button data-act="tab" data-a="${a}" class="${st.f === a ? 'on' : ''}">${ic(a)}<span>${t('n')[a]} <small>${st.counts[a] ?? ''}</small></span></button>`).join('');
  const sel = $('#county');
  sel.innerHTML = `<option value="">${t('anywhere')}</option>` + CFG.counties.map((c) => `<option value="${esc(c)}" ${st.county === c ? 'selected' : ''}>${esc(c)}</option>`).join('');

  $('#state').innerHTML = st.err ? `<div class="empty"><p>${esc(st.err)}</p><button class="btn red" data-act="retry">${t('retry')}</button></div>` : '';

  $('#secs').innerHTML = st.err ? '' : AN.filter((a) => !st.f || a === st.f).map((a) => {
    const l = st.lists[a];
    const items = l ? l.items : [];
    const body = !l && st.loading
      ? Array(4).fill('<div class="sk"></div>').join('')
      : items.length ? items.map(card).join('') : `<div class="empty" style="grid-column:1/-1">${t('none')}</div>`;
    return `<section class="sec"><div class="sh">${ic(a)}<div><h2>${t('n')[a]}</h2><small>${l ? l.total : ''} ${t('items')}</small></div>
      <button class="say" data-act="say" data-k="${a}" aria-label="${t('listen')}">🔊</button></div><div class="fence" aria-hidden="true"></div>
      <div class="grid">${body}</div>
      ${l && items.length < l.total ? `<button class="btn ghost more" data-act="more" data-a="${a}">${t('more')}</button>` : ''}</section>`;
  }).join('');
}

// ---------- overlay ----------
function closeOv() { $('#ov').innerHTML = ''; }
function mount(h) {
  $('#ov').innerHTML = `<div class="ov" data-act="bg"><div class="sheet" role="dialog" aria-modal="true" tabindex="-1">${h}</div></div>`;
  const s = $('#ov .sheet'); if (s) s.focus({ preventScroll: true });
}

// ---------- detail ----------
function openDetail(id) {
  const d = findItem(id) || (mineCache || []).find((i) => i.id === id);
  if (!d) return;
  const sx = d.sex === 'm' ? t('male') : t('female'), sz = [t('sm'), t('md'), t('lg')][d.size];
  const media = d.photo ? `<img src="${esc(d.photo)}" alt="${esc(d.breed)}">` : ic(d.animal);
  mount(`<div class="hd"><button class="x" data-act="close" aria-label="${t('close')}">✕</button><div class="img" style="aspect-ratio:4/3">${media}</div></div>
  <div class="body"><b style="font:700 26px/1.1 var(--slab);display:block;margin-bottom:6px">${esc(d.breed)}</b>
  <span class="price">KES ${kes(d.price)}</span>${d.quantity > 1 ? ` <b>${t('each')} × ${d.quantity}</b>` : ''}${d.verified ? `<span class="vtag">✓ ${t('ver')}</span>` : ''}
  <div class="facts"><div><small>${t('loc')}</small><b>${esc(d.county)}</b></div><div><small>${t('sex')}</small><b>${sx}</b></div>
  <div><small>${t('size')}</small><b>${sz}</b></div><div><small>${t('wt')}</small><b>~${d.kg} kg</b></div>
  <div><small>${t('seller')}</small><b>${esc(d.seller || '–')}</b></div><div><small>${t('posted')}</small><b>${ago(d.created_at)}</b></div></div>
  ${d.description ? `<p>${esc(d.description)}</p>` : ''}
  <div class="acts"><button class="btn grn" data-act="contact" data-kind="tel" data-id="${d.id}">📞 ${t('call')}</button>
  <button class="btn mar" data-act="contact" data-kind="wa" data-id="${d.id}">💬 ${t('wa')}</button></div>
  <div class="err" id="cmsg" role="status"></div>
  <div class="warn"><i>!</i><span style="flex:1">${t('safe')}</span><button class="say" data-act="say" data-k="safe" aria-label="${t('listen')}">🔊</button></div>
  <button class="link" data-act="report" data-id="${d.id}">⚑ ${t('report')}</button></div>`);
}
async function contact(id, kind) {
  const m = $('#cmsg');
  try {
    const r = await api('POST', `/api/listings/${id}/contact`);
    if (r.demo) { if (m) m.textContent = t('demo'); return; }
    location.href = kind === 'wa' ? r.whatsapp : r.tel;
  } catch (e) { if (m) m.textContent = errMsg(e); }
}
function openReport(id) {
  mount(`<div class="body"><div class="hd2"><h2>${t('reportQ')}</h2><button class="pill" data-act="close" aria-label="${t('close')}">✕</button></div>
  <div class="bchips" style="flex-direction:column">${['scam', 'wrong_info', 'sold', 'other'].map((r) => `<button data-act="rep" data-r="${r}" data-id="${id}">${t('r_' + r)}</button>`).join('')}</div>
  <div class="err" id="cmsg"></div></div>`);
}
async function sendReport(id, reason) {
  try { await api('POST', `/api/listings/${id}/report`, { reason }); mount(`<div class="body ok"><div class="c">✓</div><h2 style="font:700 26px var(--slab);margin:0">${t('thanks')}</h2><button class="btn red" data-act="close">${t('close')}</button></div>`); }
  catch (e) { const m = $('#cmsg'); if (m) m.textContent = errMsg(e); }
}

// ---------- sell / sign-in flow ----------
let S;
const authBlank = () => ({ stage: 'phone', phone: '', name: '', code: '', dev: '', err: '', busy: false });
function steps() {
  if (S.mode === 'signin') return ['phone'];
  return ['animal', 'breed', 'sex', 'size', 'qty', 'price', 'county', 'photo', ...(st.user ? [] : ['phone']), 'review'];
}
function openSell() {
  S = { mode: 'sell', n: 0, a: st.f, br: null, sx: null, sz: null, q: 1, p: 0, c: st.county || CFG.counties[0] || 'Nairobi', photo: null, photoUrl: '', auth: authBlank(), busy: false, err: '' };
  if (S.a) S.p = PRE[S.a][1];
  sellView();
}
function openSignin() { S = { mode: 'signin', n: 0, auth: authBlank() }; sellView(); }

function stepBody(k) {
  switch (k) {
    case 'animal': return `<div class="opts">${AN.map((a) => `<button class="opt ${S.a === a ? 'on' : ''}" data-act="pick" data-k="a" data-v="${a}">${t('one')[a]}${ic(a)}</button>`).join('')}</div>`;
    case 'breed': return `<div class="bchips">${(CFG.breeds[S.a] || []).map((b) => `<button class="${S.br === b ? 'on' : ''}" data-act="pick" data-k="br" data-v="${esc(b)}">${esc(b)}</button>`).join('')}</div>`;
    case 'sex': return `<div class="opts">${[['m', t('male'), '♂'], ['f', t('female'), '♀']].map(([v, n, s]) => `<button class="opt p ${S.sx === v ? 'on' : ''}" data-act="pick" data-k="sx" data-v="${v}"><b>${s}</b>${n}</button>`).join('')}</div>`;
    case 'size': return `<div class="sizes">${[[t('sm'), 44], [t('md'), 68], [t('lg'), 94]].map(([n, h], i) => `<button class="opt ${S.sz === i ? 'on' : ''}" data-act="pick" data-k="sz" data-v="${i}"><svg class="ic" style="width:${h}px;height:${h}px"><use href="#i-${S.a}"/></svg>${n}<small style="font:700 13px var(--sans);color:var(--mut)">~${kgOf(S.a, i)} kg</small></button>`).join('')}</div>`;
    case 'qty': return `<div class="big">${S.q}</div><div class="stp"><button class="btn ghost" data-act="qstep" data-d="-1" aria-label="−">−</button><button class="btn ghost" data-act="qstep" data-d="1" aria-label="+">＋</button></div>
      <div class="chips">${QPRE.map((x) => `<button data-act="qset" data-v="${x}">${x}</button>`).join('')}</div>`;
    case 'price': return `${S.q > 1 ? `<p class="lead" style="text-align:center">${t('perEach')}</p>` : ''}<div class="big">KES ${kes(S.p)}</div>
      <div class="stp"><button class="btn ghost" data-act="step" data-d="-1" aria-label="−">−</button><button class="btn ghost" data-act="step" data-d="1" aria-label="+">＋</button></div>
      <div class="chips">${PRE[S.a].map((x) => `<button data-act="price" data-v="${x}">${kes(x)}</button>`).join('')}</div>`;
    case 'county': return `<select class="sel" id="cs">${CFG.counties.map((c) => `<option ${S.c === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`;
    case 'photo': return `<p class="lead">${t('photoHelp')}</p><label class="photo-pick">${S.photoUrl ? `<img src="${S.photoUrl}" alt="">` : `<span style="font-size:48px">📷</span><span>${t('takePhoto')}</span>`}<input type="file" accept="image/*" id="pf"></label>`;
    case 'phone': {
      const A = S.auth;
      const inner = A.stage === 'phone'
        ? `<p class="lead">${t('why')}</p><label class="fl">${t('yourPhone')}<input class="inp" id="ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX" value="${esc(A.phone)}"></label>
           <label class="fl">${t('yourName')}<input class="inp" id="nm" autocomplete="name" maxlength="40" value="${esc(A.name)}"></label>`
        : `<p class="lead">${t('sentTo')} <b>${esc(A.phone)}</b></p><input class="inp code" id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" value="${esc(A.code || A.dev)}">
           <p><button class="link" data-act="resend">${t('resend')}</button></p>`;
      return inner + `<div class="err" role="alert">${esc(A.err)}</div>`;
    }
    case 'review': return `<div class="card" style="cursor:default"><div class="img">${S.photoUrl ? `<img src="${S.photoUrl}" alt="">` : ic(S.a)}</div><div class="tx"><b>${esc(S.br)}${S.q > 1 ? ' ×' + S.q : ''}</b>
      <span>${S.sx === 'm' ? t('male') : t('female')}, ${[t('sm'), t('md'), t('lg')][S.sz]} (~${kgOf(S.a, S.sz)} kg), ${esc(S.c)}</span><span class="pr">KES ${kes(S.p)}${S.q > 1 ? ' ' + t('each') : ''}</span></div></div>
      <div class="err" role="alert">${esc(S.err)}</div>`;
  }
  return '';
}
function stepOk(k) {
  switch (k) {
    case 'animal': return !!S.a;
    case 'breed': return !!S.br;
    case 'sex': return !!S.sx;
    case 'size': return S.sz !== null;
    case 'price': return S.p > 0;
    default: return true;
  }
}
function sellView() {
  const keys = steps(), k = keys[S.n];
  const busy = S.busy || (k === 'phone' && S.auth.busy);
  const label = k === 'review' ? '✓ ' + t('post')
    : k === 'phone' ? (S.auth.stage === 'phone' ? t('sendCode') : t('verify'))
    : k === 'photo' && !S.photo ? t('skip') : t('next');
  const title = t('q_' + k);
  mount(`<div class="body"><div style="display:flex;justify-content:flex-end"><button class="pill" data-act="close" aria-label="${t('close')}">✕</button></div>
  ${keys.length > 1 ? `<div class="post">${keys.map((_, i) => `<span class="${i <= S.n ? 'd' : ''}"></span>`).join('')}</div>` : ''}
  <div class="q"><h2>${title}</h2><button class="say" data-act="sayq" data-k="q_${k}" aria-label="${t('listen')}">🔊</button></div>${stepBody(k)}
  <div class="nav">${S.n || (k === 'phone' && S.auth.stage === 'code') ? `<button class="btn ghost" data-act="go" data-d="-1">${t('back')}</button>` : ''}
  <button class="btn ${k === 'review' ? 'grn' : 'red'}" data-act="go" data-d="1" ${stepOk(k) && !busy ? '' : 'disabled'}>${label}</button></div></div>`);
}

async function doAuth() {
  const A = S.auth;
  A.err = '';
  if (A.stage === 'phone') {
    A.phone = ($('#ph') || {}).value || A.phone; A.name = ($('#nm') || {}).value || A.name;
    A.busy = true; sellView();
    try { const r = await api('POST', '/api/auth/request', { phone: A.phone }); A.phone = r.phone; A.stage = 'code'; A.dev = r.devCode || ''; }
    catch (e) { A.err = errMsg(e); }
    A.busy = false; sellView();
  } else {
    A.code = ($('#cd') || {}).value || A.code;
    A.busy = true; sellView();
    try {
      const r = await api('POST', '/api/auth/verify', { phone: A.phone, code: A.code, name: A.name });
      st.user = r.user; A.busy = false;
      if (S.mode === 'signin') { closeOv(); render(); return; }
    } catch (e) { A.err = errMsg(e); A.busy = false; }
    render(); sellView();
  }
}
async function resendCode() {
  const A = S.auth; A.err = ''; A.busy = true; sellView();
  try { const r = await api('POST', '/api/auth/request', { phone: A.phone }); A.dev = r.devCode || ''; A.code = ''; }
  catch (e) { A.err = errMsg(e); }
  A.busy = false; sellView();
}

function resizeImage(file, max = 1100) {
  return new Promise((resolve, reject) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('image'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('image')); };
    img.src = u;
  });
}

async function submit() {
  S.busy = true; S.err = ''; sellView();
  try {
    const r = await api('POST', '/api/listings', { animal: S.a, breed: S.br, sex: S.sx, size: S.sz, price: S.p, quantity: S.q, county: S.c });
    let photoFail = false;
    if (S.photo) { try { await api('POST', `/api/listings/${r.id}/photo`, S.photo); } catch { photoFail = true; } }
    mount(`<div class="body ok"><div class="c">✓</div><h2 style="font:700 28px var(--slab);margin:0">${t('done')}</h2>${photoFail ? `<p class="err">${t('photoFail')}</p>` : ''}
      <button class="btn red" data-act="seeIt">${t('view')}</button></div>`);
    say(t('done'));
    st.county = ''; st.f = null; refresh();
  } catch (e) {
    S.busy = false; S.err = errMsg(e);
    if (e.status === 401) st.user = null;
    render(); sellView();
  }
}

function go(d) {
  const keys = steps(), k = keys[S.n];
  const cs = $('#cs'); if (cs) S.c = cs.value;
  if (d < 0) {
    if (k === 'phone' && S.auth.stage === 'code') { S.auth.stage = 'phone'; S.auth.err = ''; return sellView(); }
    S.n = Math.max(0, S.n - 1); return sellView();
  }
  if (k === 'phone') return doAuth();
  if (k === 'review') return submit();
  S.n++; sellView();
}

// ---------- my animals ----------
let mineCache = [];
async function openMine() {
  mount(`<div class="body"><div class="hd2"><h2>${t('mine')}</h2><button class="pill" data-act="close" aria-label="${t('close')}">✕</button></div><div id="minebox"><div class="sk"></div></div></div>`);
  try { mineCache = (await api('GET', '/api/me/listings')).items; renderMine(); }
  catch (e) {
    if (e.status === 401) { st.user = null; render(); return openSignin(); }
    $('#minebox').innerHTML = `<div class="err">${esc(errMsg(e))}</div>`;
  }
}
function renderMine() {
  const rows = mineCache.map((d) => {
    const status = d.status === 'flagged' ? `<span class="badge">${t('flagged')}</span>` : d.status === 'sold' ? `<span class="badge">${t('st_sold')}</span>` : `<span class="badge g">${t('st_active')}</span>`;
    return `<div class="row"><div class="th">${d.photo ? `<img src="${esc(d.photo)}" alt="">` : ic(d.animal)}</div>
      <div class="mid"><b>${esc(d.breed)}${d.quantity > 1 ? ' ×' + d.quantity : ''}</b><small>KES ${kes(d.price)} · ${esc(d.county)}</small><br>${status} <small>${d.contacts} ${t('contacts')}</small></div>
      <div class="ra">${d.status !== 'flagged' ? `<button class="mini" data-act="toggle" data-id="${d.id}" data-s="${d.status === 'sold' ? 'active' : 'sold'}">${d.status === 'sold' ? t('reopen') : t('sold')}</button>` : ''}
      <button class="mini d" data-act="delete" data-id="${d.id}">${t('del')}</button></div></div>`;
  }).join('');
  $('#minebox').innerHTML = (rows || `<div class="empty">${t('nomine')}</div>`) + `<div class="nav"><button class="btn ghost" data-act="logout">${t('logout')}</button></div>`;
}
async function mineAction(fn) {
  try { await fn(); mineCache = (await api('GET', '/api/me/listings')).items; renderMine(); refresh(); }
  catch (e) { const b = $('#minebox'); if (b) b.insertAdjacentHTML('afterbegin', `<div class="err">${esc(errMsg(e))}</div>`); }
}

// ---------- events ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, d = el.dataset;
  if (a === 'bg') { if (e.target === el) closeOv(); return; }
  switch (a) {
    case 'close': return closeOv();
    case 'lang': st.lang = st.lang === 'en' ? 'sw' : 'en'; try { localStorage.setItem('lang', st.lang); } catch {} return render();
    case 'say': return say(d.k === 'safe' ? t('safe') : t('n')[d.k]);
    case 'sayq': return say(t(d.k));
    case 'tab': st.f = d.a || null; return refresh();
    case 'more': el.disabled = true; return loadAnimal(d.a, true).then(render).catch((er) => { st.err = errMsg(er); render(); });
    case 'retry': return refresh();
    case 'card': return openDetail(+d.id);
    case 'contact': return contact(+d.id, d.kind);
    case 'report': return openReport(+d.id);
    case 'rep': return sendReport(+d.id, d.r);
    case 'sell': return openSell();
    case 'acct': return st.user ? openMine() : openSignin();
    case 'pick': {
      const v = d.k === 'sz' ? +d.v : d.v;
      if (d.k === 'a' && S.a !== v) { S.p = PRE[v][1]; S.br = null; }
      S[d.k] = v; return sellView();
    }
    case 'qstep': S.q = Math.min(500, Math.max(1, S.q + +d.d * (S.q >= 20 ? 5 : 1))); return sellView();
    case 'qset': S.q = +d.v; return sellView();
    case 'step': S.p = Math.max(STEP[S.a], S.p + STEP[S.a] * +d.d); return sellView();
    case 'price': S.p = +d.v; return sellView();
    case 'go': if (!el.disabled) go(+d.d); return;
    case 'resend': return resendCode();
    case 'seeIt': closeOv(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    case 'toggle': return mineAction(() => api('PATCH', `/api/listings/${d.id}`, { status: d.s }));
    case 'delete': if (confirm(t('confirmDel'))) mineAction(() => api('DELETE', `/api/listings/${d.id}`)); return;
    case 'logout': return api('POST', '/api/auth/logout').catch(() => {}).then(() => { st.user = null; closeOv(); render(); });
  }
});
document.addEventListener('change', async (e) => {
  if (e.target.id === 'pf' && e.target.files[0]) {
    try { S.photo = await resizeImage(e.target.files[0]); if (S.photoUrl) URL.revokeObjectURL(S.photoUrl); S.photoUrl = URL.createObjectURL(S.photo); }
    catch { S.photo = null; S.photoUrl = ''; }
    sellView();
  } else if (e.target.id === 'county') { st.county = e.target.value; refresh(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeOv();
  if (e.key === 'Enter' && e.target.matches && e.target.matches('.sheet .inp')) { e.preventDefault(); go(1); }
});

// ---------- start ----------
(async function init() {
  render();
  try {
    const [cfg, me] = await Promise.all([api('GET', '/api/config'), api('GET', '/api/me')]);
    CFG = cfg; st.user = me.user;
  } catch (e) { st.err = errMsg(e); render(); return; }
  refresh();
})();
