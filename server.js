const express = require("express");
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// 📦 Lưu key
let KEYS = {};

// 👉 route gốc (FIX lỗi của m)
app.get("/", (req, res) => {
  res.send("Server OK");
});

// 🔧 random key
function generateKey() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// 📌 Tạo key
app.post("/create-key", (req, res) => {
  const { duration, customKey } = req.body;

  let key = customKey || generateKey();

  if (KEYS[key]) {
    return res.json({ success: false });
  }

  let time = 0;

  if (duration === "1h") time = 1 * 60 * 60 * 1000;
  if (duration === "1d") time = 24 * 60 * 60 * 1000;

  const expire = Date.now() + time;

  KEYS[key] = {
    expire,
    device: null
  };

  res.json({ success: true, key, expire });
});

// 📌 Verify
app.post("/verify-key", (req, res) => {
  const { key, deviceId } = req.body;
  const data = KEYS[key];

  if (!data) {
    return res.json({ success: false });
  }

  if (Date.now() > data.expire) {
    delete KEYS[key];
    return res.json({ success: false });
  }

  if (!data.device) {
    data.device = deviceId;
    return res.json({ success: true });
  }

  if (data.device !== deviceId) {
    return res.json({ success: false });
  }

  res.json({ success: true });
});

// 📊 debug
app.get("/keys", (req, res) => {
  res.json(KEYS);
});

app.listen(PORT, () => console.log("Server chạy"));
