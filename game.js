// FILE: game.js
// GAME DATABASE & UTILITIES - Cho SunWin hoạt động trên điện thoại

// ==================== UTILS ====================
const Utils = {
    formatMoney: (num) => {
        if (num === undefined || num === null) return '0';
        let n = Number(num);
        if (isNaN(n)) return '0';
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
        return n.toString();
    },
    formatFull: (num) => {
        let n = Number(num);
        if (isNaN(n)) return '0';
        return n.toLocaleString('vi-VN') + 'đ';
    },
    genCode: (len = 10) => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < len; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }
};

// ==================== DICE LOGIC ====================
const DiceLogic = {
    roll3: () => {
        return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    },
    sum: (dice) => dice.reduce((a,b) => a + b, 0),
    isTai: (sum) => sum >= 11 && sum <= 17,
    isChan: (sum) => sum % 2 === 0,
    rollWithOverride: (override, gameType) => {
        let dice, sum, result;
        if (override) {
            if (gameType === 'taixiu') {
                let targetSum = override === 'tai' ? 14 : 8;
                dice = [4,4,6];
                if (override === 'xiu') dice = [2,2,4];
                sum = dice.reduce((a,b) => a + b, 0);
                result = override;
            } else {
                let target = override === 'chan' ? 12 : 11;
                dice = [4,4,4];
                if (override === 'le') dice = [3,4,4];
                sum = dice.reduce((a,b) => a + b, 0);
                result = override;
            }
        } else {
            dice = DiceLogic.roll3();
            sum = DiceLogic.sum(dice);
            if (gameType === 'taixiu') result = DiceLogic.isTai(sum) ? 'tai' : 'xiu';
            else result = DiceLogic.isChan(sum) ? 'chan' : 'le';
        }
        return { dice, sum, result };
    }
};

// ==================== GAME DATABASE ====================
const GameDB = (function() {
    const STORAGE_KEYS = {
        USERS: 'sunwin_users',
        CURRENT_USER: 'sunwin_current_user',
        TX_HISTORY: 'sunwin_tx_history',
        CL_HISTORY: 'sunwin_cl_history',
        AP_HISTORY: 'sunwin_ap_history',
        TX_OVERRIDE: 'sunwin_tx_override',
        CL_OVERRIDE: 'sunwin_cl_override',
        CODES: 'sunwin_codes'
    };

    // Khởi tạo dữ liệu mặc định
    function initDefaultUsers() {
        const defaultUsers = {
            'admin': { password: 'admin123', balance: 0, totalWin: 0, joinDate: Date.now() },
            'demo': { password: '123456', balance: 100000, totalWin: 0, joinDate: Date.now() }
        };
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
        return defaultUsers;
    }

    function getUsers() {
        const data = localStorage.getItem(STORAGE_KEYS.USERS);
        if (!data) return initDefaultUsers();
        return JSON.parse(data);
    }

    function saveUsers(users) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    function getUser(username) {
        const users = getUsers();
        return users[username] || null;
    }

    function createUser(username, password) {
        const users = getUsers();
        if (users[username]) return false;
        users[username] = {
            password: password,
            balance: 50000,
            totalWin: 0,
            joinDate: Date.now()
        };
        saveUsers(users);
        return true;
    }

    function updateBalance(username, amountChange) {
        const users = getUsers();
        if (!users[username]) return false;
        const newBalance = (users[username].balance || 0) + amountChange;
        if (newBalance < 0) return false;
        users[username].balance = newBalance;
        if (amountChange > 0) {
            users[username].totalWin = (users[username].totalWin || 0) + amountChange;
        }
        saveUsers(users);
        return true;
    }

    function setBalance(username, newBalance) {
        const users = getUsers();
        if (!users[username]) return false;
        const oldBalance = users[username].balance || 0;
        users[username].balance = Math.max(0, newBalance);
        if (newBalance > oldBalance) {
            users[username].totalWin = (users[username].totalWin || 0) + (newBalance - oldBalance);
        }
        saveUsers(users);
        return true;
    }

    function getCurrentUser() {
        return localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    }

    function setCurrentUser(username) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, username);
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }

    function getLeaderboard(limit = 10) {
        const users = getUsers();
        const list = [];
        for (const [name, data] of Object.entries(users)) {
            if (name !== 'admin') {
                list.push({ name, totalWin: data.totalWin || 0, balance: data.balance || 0 });
            }
        }
        list.sort((a, b) => b.totalWin - a.totalWin);
        return list.slice(0, limit);
    }

    // ========== HISTORY ==========
    function getTXHistory() {
        const data = localStorage.getItem(STORAGE_KEYS.TX_HISTORY);
        return data ? JSON.parse(data) : [];
    }

    function addTXHistory(record) {
        const history = getTXHistory();
        history.unshift(record);
        if (history.length > 100) history.pop();
        localStorage.setItem(STORAGE_KEYS.TX_HISTORY, JSON.stringify(history));
    }

    function getCLHistory() {
        const data = localStorage.getItem(STORAGE_KEYS.CL_HISTORY);
        return data ? JSON.parse(data) : [];
    }

    function addCLHistory(record) {
        const history = getCLHistory();
        history.unshift(record);
        if (history.length > 100) history.pop();
        localStorage.setItem(STORAGE_KEYS.CL_HISTORY, JSON.stringify(history));
    }

    function getAPHistory() {
        const data = localStorage.getItem(STORAGE_KEYS.AP_HISTORY);
        return data ? JSON.parse(data) : [];
    }

    function addAPHistory(record) {
        const history = getAPHistory();
        history.unshift(record);
        if (history.length > 50) history.pop();
        localStorage.setItem(STORAGE_KEYS.AP_HISTORY, JSON.stringify(history));
    }

    // ========== OVERRIDE ==========
    function getTXOverride() {
        return localStorage.getItem(STORAGE_KEYS.TX_OVERRIDE);
    }

    function setTXOverride(value) {
        if (value) localStorage.setItem(STORAGE_KEYS.TX_OVERRIDE, value);
        else localStorage.removeItem(STORAGE_KEYS.TX_OVERRIDE);
    }

    function getCLOverride() {
        return localStorage.getItem(STORAGE_KEYS.CL_OVERRIDE);
    }

    function setCLOverride(value) {
        if (value) localStorage.setItem(STORAGE_KEYS.CL_OVERRIDE, value);
        else localStorage.removeItem(STORAGE_KEYS.CL_OVERRIDE);
    }

    // ========== CODES ==========
    function getCodes() {
        const data = localStorage.getItem(STORAGE_KEYS.CODES);
        return data ? JSON.parse(data) : {};
    }

    function saveCodes(codes) {
        localStorage.setItem(STORAGE_KEYS.CODES, JSON.stringify(codes));
    }

    function createCode(code, amount) {
        const codes = getCodes();
        codes[code] = {
            amount: amount,
            used: false,
            usedBy: null,
            createdAt: Date.now()
        };
        saveCodes(codes);
        return true;
    }

    function useCode(code, username) {
        const codes = getCodes();
        if (!codes[code] || codes[code].used) return null;
        codes[code].used = true;
        codes[code].usedBy = username;
        codes[code].usedAt = Date.now();
        saveCodes(codes);
        return codes[code].amount;
    }

    // Admin functions
    function getAllUsers() {
        return getUsers();
    }

    function deleteUser(username) {
        const users = getUsers();
        if (!users[username] || username === 'admin') return false;
        delete users[username];
        saveUsers(users);
        return true;
    }

    function massAddBalance(amount) {
        const users = getUsers();
        for (const [name, data] of Object.entries(users)) {
            if (name !== 'admin') {
                users[name].balance = (users[name].balance || 0) + amount;
                users[name].totalWin = (users[name].totalWin || 0) + amount;
            }
        }
        saveUsers(users);
        return true;
    }

    return {
        getUsers, getUser, createUser, updateBalance, setBalance,
        getCurrentUser, setCurrentUser, logout, getLeaderboard,
        getTXHistory, addTXHistory, getCLHistory, addCLHistory, getAPHistory, addAPHistory,
        getTXOverride, setTXOverride, getCLOverride, setCLOverride,
        getCodes, createCode, useCode,
        getAllUsers, deleteUser, massAddBalance
    };
})();

// Export cho môi trường browser
if (typeof window !== 'undefined') {
    window.Utils = Utils;
    window.DiceLogic = DiceLogic;
    window.GameDB = GameDB;
}

console.log('game.js loaded - SunWin ready');
