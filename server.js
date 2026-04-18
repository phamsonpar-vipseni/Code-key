const express = require("express");
const app = express();

app.use(express.json());

// 📦 Lưu key
let KEYS = {};

// 🔧 Hàm random key
function generateKey() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// 📌 Tạo key
app.post("/create-key", (req, res) => {
  const { duration, customKey } = req.body;

  let key = customKey || generateKey();

  // ❌ tránh trùng key
  if (KEYS[key]) {
    return res.json({ success: false, message: "Key đã tồn tại" });
  }

  let time = 0;

  if (duration === "1h") time = 1 * 60 * 60 * 1000;
  if (duration === "3h") time = 3 * 60 * 60 * 1000;
  if (duration === "1d") time = 24 * 60 * 60 * 1000;
  if (duration === "7d") time = 7 * 24 * 60 * 60 * 1000;
  if (duration === "1m") time = 30 * 24 * 60 * 60 * 1000;
  if (duration === "1y") time = 365 * 24 * 60 * 60 * 1000;
  if (duration === "99y") time = 99 * 365 * 24 * 60 * 60 * 1000;

  const expire = Date.now() + time;

  KEYS[key] = {
    expire: expire,
    device: null
  };

  res.json({
    success: true,
    key,
    expire
  });
});

// 📌 Check key + bind thiết bị
app.post("/verify-key", (req, res) => {
  const { key, deviceId } = req.body;

  const data = KEYS[key];

  if (!data) {
    return res.json({ success: false, message: "Key không tồn tại" });
  }

  if (Date.now() > data.expire) {
    delete KEYS[key];
    return res.json({ success: false, message: "Key hết hạn" });
  }

  // 👉 bind lần đầu
  if (!data.device) {
    data.device = deviceId;
    return res.json({
      success: true,
      message: "Key hợp lệ (đã bind thiết bị)"
    });
  }

  // 👉 khác thiết bị = chặn
  if (data.device !== deviceId) {
    return res.json({
      success: false,
      message: "Key đã dùng trên thiết bị khác"
    });
  }

  res.json({
    success: true,
    message: "Key hợp lệ"
  });
});

// 📊 Xem list key (debug)
app.get("/keys", (req, res) => {
  res.json(KEYS);
});

app.listen(3000, () => console.log("Server chạy"));
