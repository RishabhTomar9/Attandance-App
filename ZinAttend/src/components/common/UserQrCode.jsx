import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import QRCode from "qrcode.react";
import { Loader2, RefreshCw } from "lucide-react";

export default function UserQrCode() {
    const { user } = useAuth();
    const [tokenData, setTokenData] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Auto-generate token on mount and interval
    useEffect(() => {
        generateToken();
        const interval = setInterval(generateToken, 45000); // Rotate every 45s
        return () => clearInterval(interval);
    }, [user.uid]);

    const generateToken = async () => {
        if (!user.uid || !user.siteId) return;
        setRefreshing(true);
        try {
            // Create a new token doc in Firestore
            // We use Firestore to ensure 'serverTimestamp' prevents client-side time spoofing
            const docRef = await addDoc(collection(db, "qr_tokens"), {
                uid: user.uid,
                siteId: user.siteId,
                role: user.role,
                createdAt: serverTimestamp(),
                status: "active", // active, used
                deviceInfo: navigator.userAgent // light binding
            });

            // The QR payload is the DOC ID + UID. 
            // Verification happens by looking up this ID in DB.
            const payload = JSON.stringify({
                id: docRef.id,
                uid: user.uid,
                siteId: user.siteId
            });

            setTokenData(payload);
        } catch (error) {
            console.error("QR Generation failed", error);
        }
        setRefreshing(false);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
            <div>
                <h2 className="font-bold text-lg text-slate-800">Secure Identity</h2>
                <p className="text-xs text-slate-500">Scan to mark attendance</p>
            </div>

            <div className="relative p-3 bg-white border-2 border-slate-900 rounded-xl shadow-lg">
                {tokenData ? (
                    <QRCode
                        value={tokenData}
                        size={200}
                        level={"H"}
                        includeMargin={true}
                    />
                ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-50">
                        <Loader2 className="animate-spin text-slate-300" size={32} />
                    </div>
                )}

                {refreshing && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm rounded-lg">
                        <Loader2 className="animate-spin text-slate-900" size={32} />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                Auto-rotates every 45s
            </div>
        </div>
    );
}
