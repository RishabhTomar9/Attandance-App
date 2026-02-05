"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAttendance = exports.markAttendance = exports.registerFace = exports.generateQrToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
// Set Config Globally
(0, v2_1.setGlobalOptions)({ region: "us-central1", maxInstances: 10 });
// --- LAZY LOADERS ---
// We use 'require' inside functions so deployment doesn't have to load these huge libraries.
function getAdmin() {
    const admin = require("firebase-admin");
    if (!admin.apps.length) {
        admin.initializeApp();
        admin.firestore().settings({ ignoreUndefinedProperties: true });
    }
    return admin;
}
function getJwt() {
    return require("jsonwebtoken");
}
function getUuid() {
    return require("uuid");
}
// --- HELPERS ---
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function getEuclideanDistance(a, b) {
    if (!a || !b || a.length !== b.length)
        return 100;
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}
function isLate(policy, now) {
    if (!policy || !policy.punchInStart)
        return false;
    const [h, m] = policy.punchInStart.split(':').map(Number);
    const policyTime = new Date(now);
    policyTime.setHours(h, m, 0, 0);
    const lateThreshold = new Date(policyTime.getTime() + (policy.lateAfterMinutes || 0) * 60000);
    return now > lateThreshold;
}
function isHalfDayStart(policy, now) {
    if (!policy || !policy.punchInStart)
        return false;
    const [h, m] = policy.punchInStart.split(':').map(Number);
    const policyTime = new Date(now);
    policyTime.setHours(h, m, 0, 0);
    const halfDayThreshold = new Date(policyTime.getTime() + (policy.halfDayAfterMinutes || 240) * 60000);
    return now > halfDayThreshold;
}
// --- EXPORTED FUNCTIONS ---
exports.generateQrToken = (0, https_1.onCall)({ secrets: ["QR_SECRET"] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const jwt = getJwt();
    const { v4: uuidv4 } = getUuid();
    const adm = getAdmin();
    const secret = process.env.QR_SECRET;
    if (!secret)
        throw new https_1.HttpsError("internal", "Server misconfiguration");
    const uid = request.auth.uid;
    const userDoc = await adm.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists)
        throw new https_1.HttpsError("not-found", "User not found");
    const user = userDoc.data();
    if (!user || !["employee", "manager"].includes(user.role)) {
        throw new https_1.HttpsError("permission-denied", "Role not authorized");
    }
    const jti = uuidv4();
    const payload = { uid, siteId: user.siteId, role: user.role, jti };
    const token = jwt.sign(payload, secret, { expiresIn: "60s" });
    await adm.firestore().collection("qrSessions").doc(jti).set({
        uid,
        createdAt: adm.firestore.FieldValue.serverTimestamp(),
        used: false,
        expiresAt: adm.firestore.Timestamp.fromMillis(Date.now() + 60000)
    });
    return { token };
});
exports.registerFace = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const { embedding } = request.data;
    if (!Array.isArray(embedding) || embedding.length !== 128) {
        throw new https_1.HttpsError("invalid-argument", "Invalid face data");
    }
    const adm = getAdmin();
    await adm.firestore().doc(`faceData/${request.auth.uid}`).set({
        embedding,
        updatedAt: adm.firestore.FieldValue.serverTimestamp(),
        registeredBy: request.auth.uid
    });
    await adm.firestore().doc(`users/${request.auth.uid}`).set({ faceRegistered: true }, { merge: true });
    return { success: true };
});
exports.markAttendance = (0, https_1.onCall)({ secrets: ["QR_SECRET"] }, async (request) => {
    var _a, _b, _c;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const jwt = getJwt();
    const adm = getAdmin();
    const secret = process.env.QR_SECRET;
    const { qrToken, lat, lng, wifiSSID, faceEmbedding } = request.data;
    if (!qrToken || !lat || !lng)
        throw new https_1.HttpsError("invalid-argument", "Missing scan data");
    // Verify JWT
    let decoded;
    try {
        decoded = jwt.verify(qrToken, secret);
    }
    catch (_d) {
        throw new https_1.HttpsError("invalid-argument", "Invalid or expired QR");
    }
    const { uid: targetUid, siteId, jti } = decoded;
    // Verify Biometrics
    if (faceEmbedding) {
        const faceDoc = await adm.firestore().doc(`faceData/${targetUid}`).get();
        if (!faceDoc.exists)
            throw new https_1.HttpsError("failed-precondition", "Face not registered");
        const storedEmbedding = (_a = faceDoc.data()) === null || _a === void 0 ? void 0 : _a.embedding;
        const distance = getEuclideanDistance(faceEmbedding, storedEmbedding);
        if (distance > 0.55)
            throw new https_1.HttpsError("permission-denied", "Face verification failed");
    }
    else {
        throw new https_1.HttpsError("invalid-argument", "Face mismatch");
    }
    // Anti-Replay
    const sessionRef = adm.firestore().collection("qrSessions").doc(jti);
    await adm.firestore().runTransaction(async (t) => {
        var _a;
        const doc = await t.get(sessionRef);
        if (!doc.exists)
            throw new https_1.HttpsError("not-found", "Token session missing");
        if ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.used)
            throw new https_1.HttpsError("permission-denied", "QR already used");
        t.update(sessionRef, { used: true, usedAt: adm.firestore.FieldValue.serverTimestamp(), scannedBy: request.auth.uid });
    });
    const siteDoc = await adm.firestore().doc(`sites/${siteId}`).get();
    if (!siteDoc.exists)
        throw new https_1.HttpsError("not-found", "Site not found");
    const site = siteDoc.data();
    const policy = site.policy || {};
    if (((_b = site.location) === null || _b === void 0 ? void 0 : _b.lat) && ((_c = site.location) === null || _c === void 0 ? void 0 : _c.lng)) {
        const distance = getDistanceFromLatLonInM(site.location.lat, site.location.lng, lat, lng);
        const radius = site.radius || 100;
        if (distance > radius)
            throw new https_1.HttpsError("permission-denied", `Outside radius (${Math.round(distance)}m)`);
    }
    if (site.wifiSSID && site.wifiSSID.length > 0 && wifiSSID !== site.wifiSSID) {
        throw new https_1.HttpsError("permission-denied", "Wrong WiFi network");
    }
    const nowJS = new Date();
    let computedStatus = "present";
    if (isHalfDayStart(policy, nowJS))
        computedStatus = "half-day";
    else if (isLate(policy, nowJS))
        computedStatus = "late";
    const today = nowJS.toISOString().split("T")[0];
    const recordRef = adm.firestore().doc(`attendance/${siteId}/records/${targetUid}_${today}`);
    const nowTimestamp = adm.firestore.FieldValue.serverTimestamp();
    const recordSnap = await recordRef.get();
    if (!recordSnap.exists) {
        await recordRef.set({
            uid: targetUid, siteId, date: today, punchIn: nowTimestamp, punchOut: null, status: computedStatus,
            logs: [{ type: "IN", time: nowTimestamp, location: { lat, lng }, scannedBy: request.auth.uid, biometric: true }]
        });
        return { message: `Punch-IN Success (${computedStatus})`, type: "IN", user: targetUid, status: computedStatus };
    }
    else {
        const record = recordSnap.data();
        if (record.punchOut)
            throw new https_1.HttpsError("already-exists", "Already punched out today");
        await recordRef.update({
            punchOut: nowTimestamp,
            logs: adm.firestore.FieldValue.arrayUnion({ type: "OUT", time: nowTimestamp, location: { lat, lng }, scannedBy: request.auth.uid, biometric: true })
        });
        return { message: "Punch-OUT Success", type: "OUT", user: targetUid };
    }
});
exports.updateAttendance = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const adm = getAdmin();
    const callerDoc = await adm.firestore().doc(`users/${request.auth.uid}`).get();
    const callerRole = (_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (!["owner", "manager"].includes(callerRole)) {
        throw new https_1.HttpsError("permission-denied", "Unauthorized");
    }
    const { siteId, recordId, updates } = request.data;
    if (!siteId || !recordId || !updates)
        throw new https_1.HttpsError("invalid-argument", "Missing data");
    const cleanUpdates = {
        modifiedBy: request.auth.uid,
        modifiedAt: adm.firestore.FieldValue.serverTimestamp()
    };
    if (updates.punchIn)
        cleanUpdates.punchIn = adm.firestore.Timestamp.fromDate(new Date(updates.punchIn));
    if (updates.punchOut)
        cleanUpdates.punchOut = adm.firestore.Timestamp.fromDate(new Date(updates.punchOut));
    if (updates.status)
        cleanUpdates.status = updates.status;
    const docRef = adm.firestore().doc(`attendance/${siteId}/records/${recordId}`);
    const oldSnap = await docRef.get();
    const oldData = oldSnap.data() || {};
    await docRef.update(cleanUpdates);
    await adm.firestore().collection(`auditLogs/${siteId}/logs`).add({
        action: "UPDATE_ATTENDANCE",
        targetUser: oldData.uid || "unknown",
        performedBy: request.auth.uid,
        timestamp: adm.firestore.FieldValue.serverTimestamp(),
        recordDate: oldData.date,
        changes: updates
    });
    return { success: true };
});
//# sourceMappingURL=index.full.js.map