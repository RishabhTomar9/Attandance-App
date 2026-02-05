import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

// Set Config Globally
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

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

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEuclideanDistance(a: number[], b: number[]) {
    if (!a || !b || a.length !== b.length) return 100;
    return Math.sqrt(a.reduce((sum: number, val: number, i: number) => sum + Math.pow(val - b[i], 2), 0));
}

function isLate(policy: any, now: Date): boolean {
    if (!policy || !policy.punchInStart) return false;
    const [h, m] = policy.punchInStart.split(':').map(Number);
    const policyTime = new Date(now);
    policyTime.setHours(h, m, 0, 0);
    const lateThreshold = new Date(policyTime.getTime() + (policy.lateAfterMinutes || 0) * 60000);
    return now > lateThreshold;
}

function isHalfDayStart(policy: any, now: Date): boolean {
    if (!policy || !policy.punchInStart) return false;
    const [h, m] = policy.punchInStart.split(':').map(Number);
    const policyTime = new Date(now);
    policyTime.setHours(h, m, 0, 0);
    const halfDayThreshold = new Date(policyTime.getTime() + (policy.halfDayAfterMinutes || 240) * 60000);
    return now > halfDayThreshold;
}

// --- EXPORTED FUNCTIONS ---

export const generateQrToken = onCall({ secrets: ["QR_SECRET"] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

    const jwt = getJwt();
    const { v4: uuidv4 } = getUuid();
    const adm = getAdmin();

    const secret = process.env.QR_SECRET;
    if (!secret) throw new HttpsError("internal", "Server misconfiguration");

    const uid = request.auth.uid;
    const userDoc = await adm.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists) throw new HttpsError("not-found", "User not found");

    const user = userDoc.data();
    if (!user || !["employee", "manager"].includes(user.role)) {
        throw new HttpsError("permission-denied", "Role not authorized");
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

export const registerFace = onCall(async (request) => {
    try {
        if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
        const { embedding } = request.data;
        if (!Array.isArray(embedding) || embedding.length !== 128) {
            throw new HttpsError("invalid-argument", "Invalid face data");
        }

        const adm = getAdmin();
        await adm.firestore().doc(`faceData/${request.auth.uid}`).set({
            embedding,
            updatedAt: adm.firestore.FieldValue.serverTimestamp(),
            registeredBy: request.auth.uid
        });
        await adm.firestore().doc(`users/${request.auth.uid}`).set({ faceRegistered: true }, { merge: true });

        return { success: true };
    } catch (err: any) {
        console.error("Register Face Error:", err);
        throw new HttpsError("internal", err.message || "Unknown Error");
    }
});

export const markAttendance = onCall({ secrets: ["QR_SECRET"] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

    const jwt = getJwt();
    const adm = getAdmin();
    const secret = process.env.QR_SECRET;

    const { qrToken, lat, lng, wifiSSID, faceEmbedding } = request.data;
    if (!qrToken || !lat || !lng) throw new HttpsError("invalid-argument", "Missing scan data");

    // Verify JWT
    let decoded: any;
    try {
        decoded = jwt.verify(qrToken, secret);
    } catch {
        throw new HttpsError("invalid-argument", "Invalid or expired QR");
    }
    const { uid: targetUid, siteId, jti } = decoded;

    // Verify Biometrics
    if (faceEmbedding) {
        const faceDoc = await adm.firestore().doc(`faceData/${targetUid}`).get();
        if (!faceDoc.exists) throw new HttpsError("failed-precondition", "Face not registered");

        const storedEmbedding = faceDoc.data()?.embedding;
        const distance = getEuclideanDistance(faceEmbedding, storedEmbedding);
        if (distance > 0.55) throw new HttpsError("permission-denied", "Face verification failed");
    } else {
        throw new HttpsError("invalid-argument", "Face mismatch");
    }

    // Anti-Replay
    const sessionRef = adm.firestore().collection("qrSessions").doc(jti);
    await adm.firestore().runTransaction(async (t: any) => {
        const doc = await t.get(sessionRef);
        if (!doc.exists) throw new HttpsError("not-found", "Token session missing");
        if (doc.data()?.used) throw new HttpsError("permission-denied", "QR already used");
        t.update(sessionRef, { used: true, usedAt: adm.firestore.FieldValue.serverTimestamp(), scannedBy: request.auth!.uid });
    });

    const siteDoc = await adm.firestore().doc(`sites/${siteId}`).get();
    if (!siteDoc.exists) throw new HttpsError("not-found", "Site not found");
    const site = siteDoc.data()!;
    const policy = site.policy || {};

    if (site.location?.lat && site.location?.lng) {
        const distance = getDistanceFromLatLonInM(site.location.lat, site.location.lng, lat, lng);
        const radius = site.radius || 100;
        if (distance > radius) throw new HttpsError("permission-denied", `Outside radius (${Math.round(distance)}m)`);
    }

    if (site.wifiSSID && site.wifiSSID.length > 0 && wifiSSID !== site.wifiSSID) {
        throw new HttpsError("permission-denied", "Wrong WiFi network");
    }

    const nowJS = new Date();
    let computedStatus = "present";
    if (isHalfDayStart(policy, nowJS)) computedStatus = "half-day";
    else if (isLate(policy, nowJS)) computedStatus = "late";

    const today = nowJS.toISOString().split("T")[0];
    const recordRef = adm.firestore().doc(`attendance/${siteId}/records/${targetUid}_${today}`);
    const nowTimestamp = adm.firestore.FieldValue.serverTimestamp();
    const recordSnap = await recordRef.get();

    if (!recordSnap.exists) {
        await recordRef.set({
            uid: targetUid, siteId, date: today, punchIn: nowTimestamp, punchOut: null, status: computedStatus,
            logs: [{ type: "IN", time: nowTimestamp, location: { lat, lng }, scannedBy: request.auth!.uid, biometric: true }]
        });
        return { message: `Punch-IN Success (${computedStatus})`, type: "IN", user: targetUid, status: computedStatus };
    } else {
        const record = recordSnap.data()!;
        if (record.punchOut) throw new HttpsError("already-exists", "Already punched out today");
        await recordRef.update({
            punchOut: nowTimestamp,
            logs: adm.firestore.FieldValue.arrayUnion({ type: "OUT", time: nowTimestamp, location: { lat, lng }, scannedBy: request.auth!.uid, biometric: true })
        });
        return { message: "Punch-OUT Success", type: "OUT", user: targetUid };
    }
});

export const updateAttendance = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    const adm = getAdmin();

    const callerDoc = await adm.firestore().doc(`users/${request.auth.uid}`).get();
    const callerRole = callerDoc.data()?.role;

    if (!["owner", "manager"].includes(callerRole)) {
        throw new HttpsError("permission-denied", "Unauthorized");
    }

    const { siteId, recordId, updates } = request.data;
    if (!siteId || !recordId || !updates) throw new HttpsError("invalid-argument", "Missing data");

    const cleanUpdates: any = {
        modifiedBy: request.auth.uid,
        modifiedAt: adm.firestore.FieldValue.serverTimestamp()
    };

    if (updates.punchIn) cleanUpdates.punchIn = adm.firestore.Timestamp.fromDate(new Date(updates.punchIn));
    if (updates.punchOut) cleanUpdates.punchOut = adm.firestore.Timestamp.fromDate(new Date(updates.punchOut));
    if (updates.status) cleanUpdates.status = updates.status;

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
