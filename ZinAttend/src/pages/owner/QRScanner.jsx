import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../../firebase/config';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, Camera, X, Activity, MapPin, Wifi, Zap, Home, ChevronLeft, RefreshCw } from 'lucide-react';

// Preload audio and unlock on first user interaction
const punchAudio = new Audio('/sound.mp3');
punchAudio.preload = 'auto';
punchAudio.load();

const unlockAudio = () => {
    punchAudio.play().then(() => { punchAudio.pause(); punchAudio.currentTime = 0; }).catch(() => { });
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
};
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

const playSound = () => {
    try {
        punchAudio.currentTime = 0;
        punchAudio.play().catch(() => { });
    } catch (e) { }
};

const QRScanner = () => {
    const { userData } = useAuth();
    const { showToast } = useUI();
    const navigate = useNavigate();
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [facingMode, setFacingMode] = useState("user");
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const html5QrCode = useRef(null);
    const isTransitioning = useRef(false);
    const processedNonces = useRef(new Set());
    const scannerId = "qr-reader";

    // Auto-restart timer after success or error
    useEffect(() => {
        let timer;
        if (scanResult?.success || error) {
            timer = setTimeout(() => {
                startScanning();
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [scanResult, error]);

    // Initial hardware connection
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (mounted) {
                    setHasMultipleCameras(devices && devices.length > 1);
                    if (devices?.length > 0) await startScanning();
                }
            } catch (err) {
                if (mounted) setError("Camera access required.");
            }
        };
        init();
        return () => {
            mounted = false;
            stopScanning();
        };
    }, []);

    const toggleCamera = async () => {
        const newMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(newMode);
        await stopScanning();
        // Brief delay for hardware release
        setTimeout(() => startScanning(newMode), 300);
    };

    const startScanning = async (overrideFacing) => {
        if (isTransitioning.current) return;
        isTransitioning.current = true;
        const mode = overrideFacing || facingMode;
        try {
            if (!html5QrCode.current) html5QrCode.current = new Html5Qrcode(scannerId);
            if (html5QrCode.current.isScanning) await html5QrCode.current.stop();

            setIsScanning(true);
            setScanResult(null);
            setError(null);

            try {
                await html5QrCode.current.start(
                    { facingMode: mode },
                    {
                        fps: 60,
                        qrbox: (viewfinderWidth, viewfinderHeight) => {
                            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                            const boxSize = Math.floor(minEdge * 0.95);
                            return { width: boxSize, height: boxSize };
                        },
                        aspectRatio: window.innerWidth / window.innerHeight,
                        videoConstraints: {
                            facingMode: mode,
                            width: { ideal: 4096 },
                            height: { ideal: 2160 },
                            frameRate: { ideal: 60 },
                            // Auto-zoom to 2x for back camera to avoid ultrawide distortion and align QR better
                            advanced: mode === "environment" ? [{ zoom: 2.0 }] : []
                        }
                    },
                    onScanSuccess,
                    () => { }
                );
            } catch (firstErr) {
                console.warn("Retrying with fallback constraints...", firstErr);
                // Fallback to absolute basics
                await html5QrCode.current.start(
                    { facingMode: mode },
                    {
                        fps: 60,
                        qrbox: (w, h) => {
                            const s = Math.floor(Math.min(w, h) * 0.8);
                            return { width: s, height: s };
                        }
                    },
                    onScanSuccess,
                    () => { }
                );
            }
        } catch (err) {
            const msg = typeof err === 'string' ? err : err.message || '';
            if (!msg.includes("already under transition")) {
                setError("Camera failed to start.");
            }
            setIsScanning(false);
        } finally {
            isTransitioning.current = false;
        }
    };

    const stopScanning = async () => {
        if (html5QrCode.current?.isScanning && !isTransitioning.current) {
            isTransitioning.current = true;
            try {
                await html5QrCode.current.stop();
                setIsScanning(false);
            } catch (err) {
                console.error("Stop error:", err);
            } finally {
                isTransitioning.current = false;
            }
        }
    };

    const onScanSuccess = async (decodedText) => {
        await stopScanning();
        setScanResult({ loading: true });

        try {
            const data = JSON.parse(decodedText);
            // Support both old and new payload formats for compatibility
            const employeeId = data.eid || data.employeeId;
            const siteId = data.sid || data.siteId;
            const timestamp = data.ts || data.timestamp;
            const lat = data.lat;
            const lng = data.lng;
            const ssid = data.net || data.ssid;
            const nonce = data.n || data.nonce;

            if (siteId !== userData.siteId) throw new Error('Incorrect site QR.');

            // Verification Sequence
            const now = new Date();
            const nowTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            const qrTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();

            // Tight 15s window to prevent photo proxy
            if (now.getTime() - qrTime > 15000) throw new Error('QR code expired.');

            // Replay protection
            const nonceKey = nonce || `${employeeId}_${timestamp}`;
            if (processedNonces.current.has(nonceKey)) throw new Error('Code already used.');
            processedNonces.current.add(nonceKey);

            // Keep recent nonces only
            if (processedNonces.current.size > 50) {
                const first = Array.from(processedNonces.current)[0];
                processedNonces.current.delete(first);
            }

            const dist = calculateDistance(lat, lng, userData.latitude, userData.longitude);
            if (dist > (userData.geoRadius || 100)) throw new Error(`Too far from office (${Math.round(dist)}m).`);

            if (userData.wifiSSID && ssid !== userData.wifiSSID) throw new Error('Connect to Office WiFi.');

            // Fetch Personnel Doc
            const userQ = query(collection(db, 'users'), where('employeeId', '==', employeeId), limit(1));
            const userSnap = await getDocs(userQ);
            if (userSnap.empty) throw new Error('Employee not found. Please contact admin.');
            const empDoc = userSnap.docs[0].data();

            // --- AUTO PUNCH LOGIC ---
            let punchType = 'IN';

            if (nowTimeStr > userData.endTime) {
                punchType = 'OUT';
            } else {
                // Check if first scan today - Index-free version
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const attendanceQ = query(
                    collection(db, 'attendance'),
                    where('employeeId', '==', employeeId)
                );

                const logSnap = await getDocs(attendanceQ);
                const todayLogs = logSnap.docs.filter(doc => {
                    const log = doc.data();
                    return log.siteId === userData.siteId &&
                        log.timestamp?.toDate() >= startOfDay;
                });

                if (todayLogs.length === 0) {
                    // First scan: Check for 1 hour grace
                    if (userData.startTime) {
                        const [startH, startM] = userData.startTime.split(':').map(Number);
                        const graceTime = new Date();
                        graceTime.setHours(startH + 1, startM, 0, 0);
                        punchType = now > graceTime ? 'HALF DAY' : 'IN';
                    } else {
                        punchType = 'IN';
                    }
                } else {
                    // Subsequent scan today
                    punchType = 'OUT';
                }
            }

            let firstInTime = null;
            let totalDuration = null;

            if (punchType === 'OUT') {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const attendanceQ = query(collection(db, 'attendance'), where('employeeId', '==', employeeId));
                const logSnap = await getDocs(attendanceQ);
                const todayLogs = logSnap.docs
                    .map(doc => ({ ...doc.data(), timestamp: doc.data().timestamp?.toDate() }))
                    .filter(log => log.siteId === userData.siteId && log.timestamp >= startOfDay)
                    .sort((a, b) => a.timestamp - b.timestamp);

                const firstInLog = todayLogs.find(log => log.type === 'IN' || log.type === 'HALF DAY');
                if (firstInLog) {
                    const firstIn = firstInLog.timestamp;
                    firstInTime = firstIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    const diffMs = now - firstIn;
                    const diffHrs = Math.floor(diffMs / 3600000);
                    const diffMins = Math.floor((diffMs % 3600000) / 60000);
                    totalDuration = `${diffHrs}h ${diffMins}m`;
                }
            }

            // Commit to Ledger
            await addDoc(collection(db, 'attendance'), {
                employeeId,
                employeeName: empDoc.name,
                siteId: userData.siteId,
                siteName: userData.siteName,
                timestamp: serverTimestamp(),
                type: punchType,
                status: 'verified',
                location: { lat, lng },
                distance: Math.round(dist)
            });

            playSound();
            setScanResult({ success: true, name: empDoc.name, type: punchType, time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }), firstInTime, totalDuration });
            showToast(`${empDoc.name} punched ${punchType} successfully`, 'success');

        } catch (err) {
            console.error(err);
            const msg = err.message || 'Error. Please try again.';
            setError(msg);
            showToast(msg, 'error');
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden select-none z-[100] font-mono">
            {/* Full Screen Scanner Layer */}
            <div id={scannerId} className="absolute inset-0 z-0 opacity-80 contrast-125"></div>

            {/* Immersive HUD Layer */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-6 pointer-events-none">

                {/* Header Overlay - Back Button Left, Node Status Right */}
                <div className="w-full flex justify-between items-start pointer-events-auto">
                    <button
                        onClick={() => navigate('/owner')}
                        className="group flex items-center space-x-2 bg-black/40 backdrop-blur-xl px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all active:scale-95 shadow-2xl"
                    >
                        <ChevronLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Home</span>
                    </button>

                    <div className="flex items-center space-x-3">
                        {hasMultipleCameras && (
                            <button
                                onClick={toggleCamera}
                                className="bg-black/40 backdrop-blur-xl p-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all active:scale-90"
                                title="Switch Camera"
                            >
                                <RefreshCw className="w-4 h-4 text-primary" />
                            </button>
                        )}
                        <div className="text-right flex flex-col items-end space-y-1">
                            <div className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-lg border border-white/10 shadow-2xl">
                                <Zap className="w-3 h-3 text-primary animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-[.2em] text-white/90">{userData?.siteName || 'Office'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Telemetry HUD */}
                <div className="w-full flex justify-center pb-8">
                    <div className="bg-black/60 backdrop-blur-3xl px-8 py-4 rounded-lg border border-white/5 flex items-center space-x-4 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                        <Activity className="w-4 h-4 text-primary animate-pulse" />
                        <div className="h-4 w-[1px] bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">Ready to Scan</span>
                            <span className="text-[7px] text-white/30 uppercase tracking-widest mt-1">Show employee QR code to the camera</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Signature Flash */}
            {scanResult?.success && (
                <div className="absolute inset-0 bg-white animate-ZinAttend-flash z-40"></div>
            )}

            {/* Premium Result Overlays */}
            {(scanResult || error) && (
                <div className="fixed inset-0 z-50 bg-black/98 backdrop-blur-[100px] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="w-full max-w-sm relative group">
                        {/* Status Backglow */}
                        <div className={`absolute -inset-20 blur-[120px] opacity-20 transition-all duration-700 ${error ? 'bg-red-500' : 'bg-primary'}`}></div>

                        <div className="bg-black border border-white/10 rounded-lg p-1 relative overflow-hidden shadow-2xl">
                            {/* Scanning Progress Header */}
                            <div className={`h-1.5 w-full ${error ? 'bg-red-500' : 'bg-primary'} animate-in slide-in-from-left duration-1000`}></div>

                            <div className="p-10 text-center space-y-12">
                                {scanResult?.loading ? (
                                    <div className="py-12 space-y-8">
                                        <div className="relative w-28 h-28 mx-auto">
                                            <div className="absolute inset-0 border-2 border-primary/15 rounded-full animate-spin-slow"></div>
                                            <div className="absolute inset-2 border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                            <div className="absolute inset-4 border-2 border-primary/10 rounded-full animate-reverse-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                                                    <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[12px] font-black tracking-[0.4em] text-primary uppercase animate-pulse">Verifying</p>
                                            <p className="text-[8px] text-white/30 uppercase tracking-[0.3em]">Checking attendance...</p>
                                        </div>
                                    </div>
                                ) : scanResult?.success ? (
                                    <div className="space-y-10 animate-in zoom-in-95 duration-500">
                                        <div className="space-y-4">
                                            <div className="w-24 h-24 bg-emerald-500/10 rounded-lg flex items-center justify-center mx-auto border-2 border-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.2)]">
                                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                            </div>
                                            <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[.5em]">Success!</h2>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[12px] font-black text-white/30 uppercase tracking-[.3em]">{scanResult.name}</p>
                                            <h3 className={`text-4xl font-black italic  transition-all ${scanResult.type === 'HALF DAY' ? 'text-amber-500' : 'text-white'}`}>
                                                {scanResult.type === 'HALF DAY' ? 'Late Entry' : scanResult.type === 'IN' ? 'Checked In' : 'Checked Out'}
                                            </h3>
                                        </div>

                                        <div className="pt-4 space-y-6">
                                            <div className="flex justify-between items-center text-[9px] font-black text-white/40 uppercase tracking-widest border-b border-white/5 pb-3">
                                                <span>Time Recorded</span>
                                                <span className="text-white font-mono">{scanResult.time}</span>
                                            </div>

                                            {scanResult.totalDuration && (
                                                <div className="p-6 bg-primary/5 border border-primary/10 rounded-lg space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[.3em]">Total Hours</span>
                                                        <span className="text-primary font-black text-xs italic tracking-widest">{scanResult.totalDuration}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[.3em]">First In</span>
                                                        <span className="text-white/60 font-bold text-[9px]">{scanResult.firstInTime}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="w-full h-1.5 bg-white/5 rounded-lg relative overflow-hidden">
                                                <div className="h-full bg-emerald-500 animate-timer-drain origin-left shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                                            </div>
                                            <p className="text-[8px] text-white/20 uppercase tracking-[.3em] font-bold">Restarting in 5s...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-12 animate-in zoom-in-95 duration-500">
                                        <div className="space-y-4">
                                            <div className="w-24 h-24 bg-red-500/10 rounded-lg flex items-center justify-center mx-auto border-2 border-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.2)]">
                                                <ShieldAlert className="w-12 h-12 text-red-500" />
                                            </div>
                                            <h2 className="text-[10px] font-black text-red-500 uppercase tracking-[.5em]">Failed</h2>
                                        </div>

                                        <div className="bg-red-500/5 p-8 border border-red-500/10 rounded-lg">
                                            <p className="text-[11px] font-black text-red-500 uppercase tracking-widest leading-relaxed italic"># {error}</p>
                                        </div>

                                        <button
                                            onClick={startScanning}
                                            className="w-full py-5 bg-red-500 text-black text-[11px] font-black uppercase tracking-[.3em] rounded-lg active:scale-95 transition-all shadow-2xl shadow-red-500/30 font-black"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                #qr-reader { position: absolute !important; width: 100% !important; height: 100% !important; left: 0; top: 0; }
                #qr-reader video { object-fit: cover !important; height: 100% !important; width: 100% !important; border-radius: 0 !important; }
                
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 8s linear infinite; }
                @keyframes reverse-spin { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
                .animate-reverse-spin { animation: reverse-spin 6s linear infinite; }
                
                @keyframes laser-move {
                    0% { top: 10%; opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-laser-move { animation: laser-move 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                
                @keyframes ZinAttend-flash {
                    0% { opacity: 1; transform: scale(2); filter: blur(20px); }
                    100% { opacity: 0; transform: scale(1); filter: blur(0px); }
                }
                .animate-ZinAttend-flash { animation: ZinAttend-flash 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards; }

                @keyframes timer-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
                .animate-timer-drain { animation: timer-drain 5s linear forwards; }
            `}</style>
        </div>
    );
};

export default QRScanner;
