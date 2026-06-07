// ===== SUNWIN GAME ENGINE =====
// Shared state across taixiu.html and ketqua.html

const DB = {
  getUsers: () => JSON.parse(localStorage.getItem('sw_users') || '{}'),
  saveUsers: (u) => localStorage.setItem('sw_users', JSON.stringify(u)),
  getCurrentUser: () => localStorage.getItem('sw_current_user'),
  setCurrentUser: (u) => localStorage.setItem('sw_current_user', u),
  logout: () => localStorage.removeItem('sw_current_user'),

  getUser: (username) => {
    const users = DB.getUsers();
    return users[username] || null;
  },

  register: (username, password) => {
    const users = DB.getUsers();
    if (users[username]) return { ok: false, msg: 'Tên tài khoản đã tồn tại!' };
    if (username.length < 4) return { ok: false, msg: 'Tên tài khoản phải có ít nhất 4 ký tự!' };
    if (password.length < 6) return { ok: false, msg: 'Mật khẩu phải có ít nhất 6 ký tự!' };
    users[username] = {
      username,
      password,
      balance: 500000,
      totalWin: 0,
      createdAt: Date.now()
    };
    DB.saveUsers(users);
    return { ok: true };
  },

  login: (username, password) => {
    const users = DB.getUsers();
    if (!users[username]) return { ok: false, msg: 'Tài khoản không tồn tại!' };
    if (users[username].password !== password) return { ok: false, msg: 'Mật khẩu không đúng!' };
    DB.setCurrentUser(username);
    return { ok: true };
  },

  updateBalance: (username, amount) => {
    const users = DB.getUsers();
    if (!users[username]) return false;
    users[username].balance = Math.max(0, (users[username].balance || 0) + amount);
    if (amount > 0) users[username].totalWin = (users[username].totalWin || 0) + amount;
    DB.saveUsers(users);
    return true;
  },

  getBalance: (username) => {
    const u = DB.getUser(username);
    return u ? u.balance : 0;
  },

  // History
  getTaixiuHistory: () => JSON.parse(localStorage.getItem('sw_tx_history') || '[]'),
  addTaixiuHistory: (record) => {
    const h = DB.getTaixiuHistory();
    h.unshift(record);
    if (h.length > 100) h.pop();
    localStorage.setItem('sw_tx_history', JSON.stringify(h));
  },

  getChanLeHistory: () => JSON.parse(localStorage.getItem('sw_cl_history') || '[]'),
  addChanLeHistory: (record) => {
    const h = DB.getChanLeHistory();
    h.unshift(record);
    if (h.length > 100) h.pop();
    localStorage.setItem('sw_cl_history', JSON.stringify(h));
  },

  getMayBayHistory: () => JSON.parse(localStorage.getItem('sw_mb_history') || '[]'),
  addMayBayHistory: (record) => {
    const h = DB.getMayBayHistory();
    h.unshift(record);
    if (h.length > 50) h.pop();
    localStorage.setItem('sw_mb_history', JSON.stringify(h));
  },

  // Controlled results
  getTaixiuResult: () => {
    const r = localStorage.getItem('sw_tx_result');
    return r ? parseInt(r) : null;
  },
  setTaixiuResult: (v) => {
    if (v === null) localStorage.removeItem('sw_tx_result');
    else localStorage.setItem('sw_tx_result', v);
  },
  getChanLeResult: () => {
    const r = localStorage.getItem('sw_cl_result');
    return r ? parseInt(r) : null;
  },
  setChanLeResult: (v) => {
    if (v === null) localStorage.removeItem('sw_cl_result');
    else localStorage.setItem('sw_cl_result', v);
  },

  // Gift codes
  getCodes: () => JSON.parse(localStorage.getItem('sw_codes') || '{}'),
  addCode: (code, amount) => {
    const codes = DB.getCodes();
    codes[code] = { amount, used: false };
    localStorage.setItem('sw_codes', JSON.stringify(codes));
  },
  useCode: (code, username) => {
    const codes = DB.getCodes();
    if (!codes[code]) return { ok: false, msg: 'Mã code không tồn tại!' };
    if (codes[code].used) return { ok: false, msg: 'Mã code đã được sử dụng!' };
    const amount = codes[code].amount;
    codes[code].used = true;
    codes[code].usedBy = username;
    localStorage.setItem('sw_codes', JSON.stringify(codes));
    DB.updateBalance(username, amount);
    return { ok: true, amount };
  },

  // Leaderboard
  getLeaderboard: () => {
    const users = DB.getUsers();
    return Object.values(users)
      .sort((a, b) => (b.totalWin || 0) - (a.totalWin || 0))
      .slice(0, 20);
  }
};

// Format money
function fmtMoney(n) {
  return Number(n).toLocaleString('vi-VN');
}

// Dice roll
function rollDice(count = 3) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

window.DB = DB;
window.fmtMoney = fmtMoney;
window.rollDice = rollDice;
