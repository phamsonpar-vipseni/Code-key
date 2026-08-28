(function () {
    "use strict";

    const PACKAGES = ["V1", "V2", "V3", "PREMIUM"];

    function normalizeUID(uid) {
        return String(uid || "").trim().toUpperCase();
    }

    function createKeyRecord(uid, packageName) {
        const cleanUID = normalizeUID(uid);
        const cleanPackage = String(packageName || "")
            .trim()
            .toUpperCase();

        if (!cleanUID) {
            throw new Error("UID / mã máy không được để trống.");
        }

        if (!PACKAGES.includes(cleanPackage)) {
            throw new Error("Gói key không hợp lệ.");
        }

        
        const key = cleanUID + "_" + cleanPackage;

       
        const line = key + ":" + key;

        return {
            key: key,
            uid: cleanUID,
            package: cleanPackage,
            line: line
        };
    }

    function generateKey(uid, packageName) {
        return createKeyRecord(uid, packageName).key;
    }

    window.createKeyRecord = createKeyRecord;
    window.generateKey = generateKey;

})();
