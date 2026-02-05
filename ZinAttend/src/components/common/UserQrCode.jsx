import { useState, useEffect } from "react";
import { functions } from "../../services/firebase";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../../context/AuthContext";
import { QRCodeCanvas } from "qrcode.react";
import { Loader2, RefreshCw } from "lucide-react";

export default function UserQrCode() {
    const { user } = useAuth();
    const [tokenData, setTokenData] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        generateToken();
        const interval = setInterval(generateToken, 45000);
        return () => clearInterval(interval);
    }, [user.uid]);

    const generateToken = async () => {
        if (!user.uid) return;
        setRefreshing(true);
        setErrorMsg("");

        try {
            const generateQrToken = httpsCallable(functions, "generateQrToken");
            const result = await generateQrToken();
            const { token } = result.data;
            setTokenData(token);
        } catch (error) {
            console.error("QR Generation failed", error);
            // Don't show technical error to user, just 'Retrying' or simple fail
            setErrorMsg("Refresh to load ID");
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
                    <QRCodeCanvas
                        value={tokenData}
                        size={200}
                        level={"H"}
                        includeMargin={true}
                    />
                ) : errorMsg ? (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-rose-50 text-rose-500 text-xs px-4 text-center">
                        {errorMsg}
                    </div>
                ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-50">
                        <Loader2 className="animate-spin text-slate-300" size={32} />
                    </div>
                )}

                {refreshing && tokenData && (
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
