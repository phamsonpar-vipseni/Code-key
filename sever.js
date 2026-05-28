const express = require('express');
const crypto  = require('crypto');
const cors    = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const CONFIG = {
  ADMIN_SECRET : 'phamsoncheat',
  MAX_FAIL     : 5,
  LOCKOUT_MS   : 10 * 60 * 1000,
  RATE_WINDOW  : 60 * 1000,
  RATE_MAX     : 20,
};

const keyStore = new Map();
const failLog  = new Map();
const rateLog  = new Map();

function rateLimit(req, res, next) {
  const ip  = req.ip;
  const now = Date.now();
  const log = (rateLog.get(ip) || []).filter(t => now - t < CONFIG.RATE_WINDOW);
  log.push(now);
  rateLog.set(ip, log);
  if (log.length > CONFIG.RATE_MAX)
    return res.status(429).json({ success: false, message: 'Too many requests!' });
  next();
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-secret'] || req.body?.adminSecret;
  if (token !== CONFIG.ADMIN_SECRET)
    return res.status(403).json({ success: false, message: 'Unauthorized!' });
  next();
}

function checkBrute(ip) {
  const e = failLog.get(ip);
  if (!e) return { blocked: false };
  if (e.lockedUntil && Date.now() < e.lockedUntil)
    return { blocked: true, wait: Math.ceil((e.lockedUntil - Date.now()) / 1000) };
  return { blocked: false };
}
function recordFail(ip) {
  const e = failLog.get(ip) || { count: 0, lockedUntil: null };
  e.count++;
  if (e.count >= CONFIG.MAX_FAIL) {
    e.lockedUntil = Date.now() + CONFIG.LOCKOUT_MS;
    e.count = 0;
  }
  failLog.set(ip, e);
}
function recordOk(ip) { failLog.delete(ip); }

function makeKey({ label='User', maxUses=0, daysValid=30, prefix='phamson', platform='ios' } = {}) {
  const p1  = crypto.randomBytes(4).toString('hex').toUpperCase();
  const p2  = crypto.randomBytes(4).toString('hex').toUpperCase();
  const key = `${prefix}-${platform}-${p1}-${p2}`;
  const now = new Date();
  const exp = new Date(now);
  exp.setDate(exp.getDate() + daysValid);
  return { key, label, uses: 0, maxUses, expiresAt: exp.toISOString(), createdAt: now.toISOString(), active: true };
}

function checkKey(o) {
  if (!o.active)                             return { ok:false, reason:'Key disabled' };
  if (new Date() > new Date(o.expiresAt))    return { ok:false, reason:'Key expired' };
  if (o.maxUses > 0 && o.uses >= o.maxUses) return { ok:false, reason:'Key used up' };
  return { ok: true };
}

app.post('/generate-key', rateLimit, requireAdmin, (req, res) => {
  const { label, maxUses, daysValid, prefix, platform } = req.body || {};
  const obj = makeKey({
    label,
    maxUses:   parseInt(maxUses)   || 0,
    daysValid: parseInt(daysValid) || 30,
    prefix:    (prefix   || 'phamson').toLowerCase().replace(/[^a-z0-9]/g, ''),
    platform:  (platform || 'ios').toLowerCase().replace(/[^a-z0-9]/g, ''),
  });
  keyStore.set(obj.key, obj);
  console.log('[+] Key created: ' + obj.key);
  res.json({ success: true, keyInfo: obj });
});

app.get('/list-keys', rateLimit, requireAdmin, (req, res) => {
  const keys = Array.from(keyStore.values()).map(o => ({
    ...o, status: checkKey(o).ok ? 'valid' : checkKey(o).reason
  }));
  res.json({ total: keys.length, keys });
});

app.post('/verify-key', rateLimit, (req, res) => {
  const ip  = req.ip;
  const { key } = req.body || {};
  const bf = checkBrute(ip);
  if (bf.blocked)
    return res.status(429).json({ success: false, message: 'IP locked! Try again in ' + bf.wait + 's' });
  if (!key)
    return res.status(400).json({ success: false, message: 'Missing key!' });
  setTimeout(() => {
    const obj = keyStore.get(key.trim());
    if (!obj) { recordFail(ip); return res.status(404).json({ success: false, message: 'Key not found' }); }
    const { ok, reason } = checkKey(obj);
    if (!ok) { recordFail(ip); return res.status(401).json({ success: false, message: reason }); }
    recordOk(ip);
    obj.uses++;
    res.json({
      success: true,
      message: 'Key valid',
      keyInfo: {
        label:     obj.label,
        uses:      obj.uses,
        maxUses:   obj.maxUses === 0 ? 'unlimited' : obj.maxUses,
        expiresAt: obj.expiresAt.split('T')[0],
      }
    });
  }, 200 + Math.random() * 150);
});

app.patch('/disable-key', rateLimit, requireAdmin, (req, res) => {
  const obj = keyStore.get(req.body?.key);
  if (!obj) return res.status(404).json({ success: false, message: 'Key not found' });
  obj.active = false;
  res.json({ success: true, message: 'Key disabled' });
});

app.delete('/delete-key', rateLimit, requireAdmin, (req, res) => {
  if (keyStore.delete(req.body?.key))
    res.json({ success: true, message: 'Key deleted' });
  else
    res.status(404).json({ success: false, message: 'Key not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
