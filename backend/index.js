const { onRequest } = require("firebase-functions/v2/https");

// Lazy load dependencies to stay within the 10s discovery timeout on Windows
let app;

exports.api = onRequest({
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true
}, async (req, res) => {
    if (!app) {
        const admin = require("firebase-admin");
        const express = require("express");
        const corsLib = require("cors");
        const { v4: uuidv4 } = require("uuid");

        admin.initializeApp();
        app = express();
        app.use(corsLib({ origin: true }));
        app.use(express.json());

        const db = admin.firestore();

        // Helpers
        const authenticate = async (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const idToken = authHeader.split('Bearer ')[1];
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                req.user = decodedToken;
                next();
            } catch (error) {
                res.status(401).json({ error: "Invalid token" });
            }
        };

        const euclideanDistance = (v1, v2) => {
            return Math.sqrt(v1.reduce((sum, val, i) => sum + Math.pow(val - v2[i], 2), 0));
        };

        // --- ENDPOINTS ---

        app.post("/registerFace", authenticate, async (req, res) => {
            const { embedding } = req.body;
            const uid = req.user.uid;
            if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
                return res.status(400).json({ error: "Invalid embedding" });
            }
            const batch = db.batch();
            batch.set(db.collection("faceData").doc(uid), {
                embedding, updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            batch.update(db.collection("users").doc(uid), {
                faceRegistered: true, faceRegisteredAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await batch.commit();
            res.status(200).json({ success: true });
        });

        app.post("/generateQrToken", authenticate, async (req, res) => {
            const uid = req.user.uid;
            const token = uuidv4();
            await db.collection("qrSessions").doc(token).set({
                uid, createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), used: false
            });
            res.status(200).json({ token });
        });

        app.post("/resetFace", authenticate, async (req, res) => {
            const { targetUid } = req.body;
            const callerUid = req.user.uid;
            const callerSnap = await db.collection("users").doc(callerUid).get();
            const callerData = callerSnap.data();
            if (callerData?.role !== 'owner' && callerData?.role !== 'manager') {
                return res.status(403).json({ error: "Permission Denied" });
            }
            const batch = db.batch();
            batch.delete(db.collection("faceData").doc(targetUid));
            batch.update(db.collection("users").doc(targetUid), {
                faceRegistered: false, faceRegisteredAt: admin.firestore.FieldValue.delete()
            });
            await batch.commit();
            res.status(200).json({ success: true });
        });

        app.post("/markAttendance", authenticate, async (req, res) => {
            const { qrToken, faceEmbedding, lat, lng } = req.body;
            try {
                // 1. Verify QR Session
                const qrSnap = await db.collection("qrSessions").doc(qrToken).get();
                if (!qrSnap.exists) return res.status(404).json({ error: "Invalid QR Session" });

                const qrData = qrSnap.data();
                if (qrData.used) return res.status(400).json({ error: "QR already used" });
                if (qrData.expiresAt.toDate() < new Date()) return res.status(400).json({ error: "QR expired" });

                const uid = qrData.uid;

                // 2. Verify Biometrics
                const faceSnap = await db.collection("faceData").doc(uid).get();
                if (!faceSnap.exists) return res.status(400).json({ error: "Biometric profile not found" });

                const storedEmbedding = faceSnap.data().embedding;
                const distance = euclideanDistance(faceEmbedding, storedEmbedding);

                if (distance > 0.6) { // face-api.js default threshold is ~0.6
                    return res.status(400).json({ error: "Face mismatch. Verification failed." });
                }

                // 3. Record Attendance
                const userSnap = await db.collection("users").doc(uid).get();
                const userData = userSnap.data();
                const siteId = userData.siteId;
                const today = new Date().toISOString().split('T')[0];

                const recordRef = db.collection("attendance").doc(siteId).collection("records").doc(`${today}_${uid}`);
                const recordSnap = await recordRef.get();

                if (!recordSnap.exists) {
                    await recordRef.set({
                        uid, date: today, punchIn: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'present', locationIn: new admin.firestore.GeoPoint(lat, lng)
                    });
                } else {
                    await recordRef.update({
                        punchOut: admin.firestore.FieldValue.serverTimestamp(),
                        locationOut: new admin.firestore.GeoPoint(lat, lng)
                    });
                }

                // 4. Mark QR as used
                await qrSnap.ref.update({ used: true });

                res.status(200).json({ success: true, message: `Welcome ${userData.displayName || 'User'}` });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Internal Error" });
            }
        });

        app.post("/updateAttendance", authenticate, async (req, res) => {
            const { siteId, recordId, updates } = req.body;
            const callerUid = req.user.uid;

            const callerSnap = await db.collection("users").doc(callerUid).get();
            const callerData = callerSnap.data();
            if (callerData?.role !== 'owner' && callerData?.role !== 'manager') {
                return res.status(403).json({ error: "Permission Denied" });
            }

            const cleanUpdates = {};
            if (updates.punchIn) cleanUpdates.punchIn = admin.firestore.Timestamp.fromDate(new Date(updates.punchIn));
            if (updates.punchOut) cleanUpdates.punchOut = admin.firestore.Timestamp.fromDate(new Date(updates.punchOut));
            if (updates.status) cleanUpdates.status = updates.status;

            await db.collection("attendance").doc(siteId).collection("records").doc(recordId).update(cleanUpdates);
            res.status(200).json({ success: true });
        });
    }

    return app(req, res);
});
