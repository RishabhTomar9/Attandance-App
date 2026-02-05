import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
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
        setLoading(true);
        try {
            const todayStr = getTodayString();

            // 1. Check Today's Status
            const todayQuery = query(
                collection(db, "attendance"),
                where("userId", "==", user.uid),
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
                collection(db, "attendance"),
                where("userId", "==", user.uid),
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
            alert("Cannot Clock In: Verification failed. Please ensure you are in the office.");
            return;
        }
        if (todayRecord) {
            alert("You have already clocked in today.");
            return;
        }

        try {
            const todayStr = getTodayString();
            const newRecord = {
                userId: user.uid,
                siteId: user.siteId,
                date: todayStr,
                checkIn: serverTimestamp(),
                checkOut: null,
                status: "present", // Basic logic for now
                locationCheckIn: validation.distance ? { distance: validation.distance } : null
            };

            await addDoc(collection(db, "attendance"), newRecord);
            await fetchAttendanceData(); // Refresh state
        } catch (error) {
            console.error("Clock In failed", error);
            alert("Failed to clock in. Please try again.");
        }
    };

    const clockOut = async () => {
        if (!todayRecord) {
            alert("No active session found.");
            return;
        }
        // Optional: Do we enforce location for clock-out? Maybe safer not to, in case they left and forgot.
        // But prompt implies standard attendance logic. Let's allow remote clock-out for safety but log it?
        // For strict attendance, we enforce it. Let's enforce it for consistency.
        if (!validation.isWithinRadius) {
            const confirm = window.confirm("You seem to be away from the office location. Clock out anyway?");
            if (!confirm) return;
        }

        try {
            const recordRef = doc(db, "attendance", todayRecord.id);
            await updateDoc(recordRef, {
                checkOut: serverTimestamp(),
                locationCheckOut: validation.distance ? { distance: validation.distance } : null
            });
            await fetchAttendanceData();
        } catch (error) {
            console.error("Clock Out failed", error);
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
