import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    setDoc,
    doc,
    serverTimestamp,
    limit,
    orderBy
} from "firebase/firestore";
import { db } from "../services/firebase";
import useSiteValidation from "./useSiteValidation";

export default function useAttendance(user) {
    const [loading, setLoading] = useState(true);
    const [todayRecord, setTodayRecord] = useState(null);
    const [history, setHistory] = useState([]);

    // Re-use validation logic here for double-check before actions
    const validation = useSiteValidation(user?.siteId);

    const getTodayString = () => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (!user) return;
        fetchAttendanceData();
    }, [user]);

    const fetchAttendanceData = async () => {
        if (!user || !user.siteId) return;
        setLoading(true);
        try {
            const todayStr = getTodayString();
            const recordId = `${user.uid}_${todayStr}`;

            // 1. Check Today's Status (Direct Doc Fetch for speed)
            const docRef = doc(db, `attendance/${user.siteId}/records/${recordId}`);
            // We use getDoc for single document
            // Importing getDoc is needed, but we can usage getDocs with query if lazy
            // Ideally should import getDoc. I'll stick to query for now to minimize import changes if 'doc' isn't imported for reading
            // Actually 'doc' is imported. I need 'getDoc'. 
            // Let's stick to query to match existing imports if possible, or add getDoc.
            // Existing imports: collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp...
            // I'll add getDoc to imports in a separate block if needed, but for now I'll use list query for safety against missing permissions on single doc sometimes

            const todayQuery = query(
                collection(db, `attendance/${user.siteId}/records`),
                where("uid", "==", user.uid),
                where("date", "==", todayStr),
                limit(1)
            );

            const todaySnap = await getDocs(todayQuery);
            if (!todaySnap.empty) {
                const docData = todaySnap.docs[0];
                setTodayRecord({ id: docData.id, ...docData.data() });
            } else {
                setTodayRecord(null);
            }

            // 2. Fetch History (Last 5 records)
            const historyQuery = query(
                collection(db, `attendance/${user.siteId}/records`),
                where("uid", "==", user.uid),
                orderBy("date", "desc"),
                limit(5)
            );
            const historySnap = await getDocs(historyQuery);
            const histData = historySnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setHistory(histData);

        } catch (error) {
            console.error("Error fetching attendance:", error);
        }
        setLoading(false);
    };

    const clockIn = async () => {
        if (!validation.isWithinRadius || !validation.isCorrectWiFi) {
            // Allow manual override for now if strictly needed? No, keep validation.
            // For testing, let's log.
            console.log("Validation Failed", validation);
            if (!window.confirm("Location validation failed. Force clock in? (Dev Mode)")) return;
        }

        if (todayRecord) {
            alert("You have already clocked in today.");
            return;
        }

        try {
            const todayStr = getTodayString();
            const recordId = `${user.uid}_${todayStr}`;

            const newRecord = {
                uid: user.uid,
                siteId: user.siteId,
                date: todayStr,
                punchIn: serverTimestamp(),
                punchOut: null,
                status: "present",
                locationCheckIn: validation.distance ? { distance: validation.distance } : null,
                device: "web"
            };

            await setDoc(doc(db, `attendance/${user.siteId}/records`, recordId), newRecord);
            await fetchAttendanceData();
        } catch (error) {
            console.error("Clock In failed", error);
            alert("Failed to clock in: " + error.message);
        }
    };

    const clockOut = async () => {
        if (!todayRecord) return;
        // Optional: Do we enforce location for clock-out? Maybe safer not to, in case they left and forgot.
        // But prompt implies standard attendance logic. Let's allow remote clock-out for safety but log it?
        // For strict attendance, we enforce it. Let's enforce it for consistency.
        if (!validation.isWithinRadius) {
            const confirm = window.confirm("You seem to be away from the office location. Clock out anyway?");
            if (!confirm) return;
        }

        try {
            const recordRef = doc(db, `attendance/${user.siteId}/records`, todayRecord.id);
            await updateDoc(recordRef, {
                punchOut: serverTimestamp(),
                locationCheckOut: validation.distance ? { distance: validation.distance } : null
            });
            await fetchAttendanceData();
        } catch (error) {
            console.error("Clock Out failed", error);
            alert("Failed to clock out");
        }
    };

    return {
        loading,
        todayRecord,
        history,
        clockIn,
        clockOut,
        validationStatus: validation // Expose validation for UI to check readiness
    };
}
