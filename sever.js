const express = require('express');
const crypto  = require('crypto');
const cors    = require('cors');


  ADMIN_SECRET : 'phamsoncheat',
  MAX_FAIL     : 5,               // Sai 5 lần → khóa IP
  LOCKOUT_MS   : 10 * 60 * 1000, // Khóa 10 phút
  RATE_WINDOW  : 60 * 1000,      // Cửa sổ rate limit: 1 phút
  RATE_MAX     : 20,             // Tối đa 20 req/phút/IP
};const app = express();
app.use(express.json());
app.use(cors());

// ============================================================
//  CẤU HÌNH  ← Đổi ADMIN_SECRET trước khi dùng thật!
// ============================================================
const CONFIG = {

// ============================================================
//  LƯU TRỮ (RAM)
// ============================================================
const keyStore = new Map(); // key (string) → keyObj
const failLog  = new Map(); // ip → { count, lockedUntil }
const rateLog  = new Map(); // ip → [timestamps]

// ============================================================
//  MIDDLEWARE: RATE LIMIT
// ============================================================
function rateLimit(req, res, next) {
  const ip  = req.ip;
  const now = Date.now();
  const log = (rateLog.get(ip) || []).filter(t => now - t < CONFIG.RATE_WINDOW);
  log.push(now);
  rateLog.set(ip, log);
  if (log.length > CONFIG.RATE_MAX)
    return res.status(429).json({ success: false, message: '⛔ Quá nhiều request! Thử lại sau.' });
  next();
}

// ============================================================
//  MIDDLEWARE: YÊU CẦU ADMIN SECRET
// ============================================================
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-secret'] || req.body?.adminSecret;
  if (token !== CONFIG.ADMIN_SECRET)
    return res.status(403).json({ success: false, message: '🚫 Sai mật khẩu admin!' });
  next();
}

// ============================================================
//  BRUTE FORCE PROTECTION
// ============================================================
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
    console.warn(`[!] Khóa IP: ${ip}`);
  }
  failLog.set(ip, e);
}
function recordOk(ip) { failLog.delete(ip); }

// ============================================================
//  TẠO KEY: phamson-ios-XXXXXXXX-XXXXXXXX
// ============================================================
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
  if (!o.active)                              return { ok:false, reason:'Key bị vô hiệu hóa 🚫' };
  if (new Date() > new Date(o.expiresAt))     return { ok:false, reason:'Key hết hạn ⏰' };
  if (o.maxUses > 0 && o.uses >= o.maxUses)  return { ok:false, reason:`Hết ${o.maxUses} lượt 🔒` };
  return { ok: true };
}

// ============================================================
//  ROUTES
// ============================================================

// 1. TẠO KEY  POST /generate-key  [ADMIN]
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
  console.log(`[+] Key tạo: ${obj.key}  label="${obj.label}"`);
  res.json({ success: true, keyInfo: obj });
});

// 2. DANH SÁCH KEY  GET /list-keys  [ADMIN]
app.get('/list-keys', rateLimit, requireAdmin, (req, res) => {
  const keys = Array.from(keyStore.values()).map(o => ({
    ...o, status: checkKey(o).ok ? 'valid' : checkKey(o).reason
  }));
  res.json({ total: keys.length, keys });
});

// 3. XÁC THỰC KEY  POST /verify-key  [PUBLIC]
app.post('/verify-key', rateLimit, (req, res) => {
  const ip  = req.ip;
  const { key } = req.body || {};

  const bf = checkBrute(ip);
  if (bf.blocked)
    return res.status(429).json({ success: false, message: `🔒 IP bị khóa! Thử lại sau ${bf.wait}s` });
  if (!key)
    return res.status(400).json({ success: false, message: 'Thiếu key!' });

  // Delay ngẫu nhiên chống timing attack
  setTimeout(() => {
    const obj = keyStore.get(key.trim());
    if (!obj) { recordFail(ip); return res.status(404).json({ success: false, message: 'Key không tồn tại ❌' }); }

    const { ok, reason } = checkKey(obj);
    if (!ok) { recordFail(ip); return res.status(401).json({ success: false, message: reason }); }

    recordOk(ip);
    obj.uses++;

    res.json({
      success: true,
      message: 'Key hợp lệ ✅',
      keyInfo: {
        label:     obj.label,
        uses:      obj.uses,
        maxUses:   obj.maxUses === 0 ? '∞' : obj.maxUses,
        expiresAt: obj.expiresAt.split('T')[0],
      }
    });
  }, 200 + Math.random() * 150);
});

// 4. VÔ HIỆU HÓA KEY  PATCH /disable-key  [ADMIN]
app.patch('/disable-key', rateLimit, requireAdmin, (req, res) => {
  const obj = keyStore.get(req.body?.key);
  if (!obj) return res.status(404).json({ success: false, message: 'Không tìm thấy key' });
  obj.active = false;
  res.json({ success: true, message: 'Đã vô hiệu hóa ✅' });
});

// 5. XÓA KEY  DELETE /delete-key  [ADMIN]
app.delete('/delete-key', rateLimit, requireAdmin, (req, res) => {
  if (keyStore.delete(req.body?.key))
    res.json({ success: true, message: 'Đã xóa key 🗑️' });
  else
    res.status(404).json({ success: false, message: 'Không tìm thấy key' });
});

// ============================================================
//  KHỞI ĐỘNG
// ============================================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n✅  Server: http://localhost:${PORT}`);
  console.log(`   Admin Secret: ${CONFIG.ADMIN_SECRET}`);
  console.log('   ⚠️  Đổi ADMIN_SECRET trước khi dùng thật!\n');
});
