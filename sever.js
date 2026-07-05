require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// TỰ ĐỘNG PHỤC VỤ FILE TRONG THƯ MỤC PUBLIC
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối DB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/proxy")
    .then(() => console.log('Database Connected'))
    .catch(err => console.error(err));

// API Tạo Key
app.post('/api/create-key', async (req, res) => {
    // Tạm thời trả về kết quả giả lập để test giao diện
    const { owner, hours } = req.body;
    console.log(`Đang tạo key cho: ${owner}, thời hạn: ${hours} giờ`);
    res.json({ message: "Key đã được tạo thành công trong DB!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server admin chạy tại: http://localhost:${PORT}`));
