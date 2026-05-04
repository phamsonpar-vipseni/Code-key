// 🧠 JS ẨN LẠI CRUD MỞ RỘNG & THỰC HIỆN TẤT CẢ

// 🔐 Admin thông tin (ẩn trong JS, không lộ ra HTML)
const encodedAdminUser = "bmFuZGZlcnNl";     // base64("admin")
const encodedAdminPass = "ZXZpZGZlcnNl";      // base64("evilgpt")

function decodeBase64(str) {
    return atob(str); // Giải mã base64
}

// 🧠 Token Facebook và TikTok (ẩn trong JS, không hiển thị trực tiếp)
const fb_token_str = "JFRnN2dkb3NlcnZlcnNlIiwiZnJhY3ZlcmNlIjoyfQ=="; // base64("YOUR_FACEBOOK_TOKEN")
const tiktok_token_str = "aHR0cHM6Ly90dWppdC5jb20vY29udGVudC91c2luZy9wYWdlfHJlZG1vbi51dGFibGUvMGNMJjoiZWp4QW1xdW90b24iOnsiaW50LXNlY3VyaXRhbGxlci5maWx0IjoiY29udGVudCIsInByb2Zpb
