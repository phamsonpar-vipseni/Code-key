document.getElementById('generateBtn').addEventListener('click', function() {
    // Lấy dữ liệu từ form
    let name = document.getElementById('configName').value.trim();
    let desc = document.getElementById('configDesc').value.trim();
    let identifier = document.getElementById('identifier').value.trim();
    let ssid = document.getElementById('ssid').value.trim();
    let password = document.getElementById('password').value;
    let security = document.getElementById('security').value;

    if (!name || !desc || !identifier || !ssid) {
        alert('Vui lòng điền đầy đủ tên cấu hình, mô tả, mã định danh và SSID WiFi.');
        return;
    }

    // Tạo nội dung XML cho file mobileconfig (cấu hình WiFi)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadDisplayName</key>
            <string>${escapeXml(name)}</string>
            <key>PayloadDescription</key>
            <string>${escapeXml(desc)}</string>
            <key>PayloadIdentifier</key>
            <string>${escapeXml(identifier)}.wifi</string>
            <key>PayloadType</key>
            <string>com.apple.wifi.managed</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>PayloadUUID</key>
            <string>${generateUUID()}</string>
            <key>SSID_STR</key>
            <string>${escapeXml(ssid)}</string>`;

    // Thêm mật khẩu nếu có
    if (password !== "") {
        xml += `
            <key>Password</key>
            <string>${escapeXml(password)}</string>`;
    }

    // Thêm loại bảo mật
    if (security !== "None") {
        xml += `
            <key>SecurityType</key>
            <string>${escapeXml(security)}</string>`;
    }

    xml += `
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>${escapeXml(name)}</string>
    <key>PayloadDescription</key>
    <string>${escapeXml(desc)}</string>
    <key>PayloadIdentifier</key>
    <string>${escapeXml(identifier)}</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${generateUUID()}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    // Tạo file .mobileconfig và tải về
    const blob = new Blob([xml], { type: 'application/x-apple-aspen-config' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${name.replace(/\s+/g, '_')}.mobileconfig`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});

// Hàm tạo UUID giả định dạng chuẩn
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).toUpperCase();
}

// Hàm escape ký tự XML
function escapeXml(str) {
    return str.replace(/[<>&'"]/g, function(match) {
        switch(match) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return match;
        }
    });
}
