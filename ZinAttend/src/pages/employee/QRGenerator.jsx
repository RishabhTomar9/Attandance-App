import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { db } from '../../firebase/config';
import { MapPin, Wifi, RefreshCw, AlertTriangle, ShieldCheck, Activity, Target, Zap, Clock, Maximize2 } from 'lucide-react';
import Loader from '../../components/UI/Loader';

// QR code size matches the scanner's expected scan area
// Scanner qrbox is ~65% of viewfinder, this QR fills most of the employee's screen
const QR_SIZE = 280;

const QRGenerator = () => {
    const { userData } = useAuth();
    const { showToast } = useUI();
    const [qrData, setQrData] = useState(null);
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(10);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const qrContainerRef = useRef(null);

    const generatePayload = useCallback(() => {
        if (!location.lat || !location.lng || !userData?.employeeId) return;

        // Compressed payload for simpler QR (fewer modules)
        const payload = {
            eid: userData.employeeId,
            sid: userData.siteId,
            ts: Date.now(),
            lat: parseFloat(location.lat.toFixed(5)),
            lng: parseFloat(location.lng.toFixed(5)),
            net: userData.wifiSSID || '',
            n: Math.random().toString(36).substring(2, 9), // Compact 7-char nonce
            v: "3.0"
        };

        setQrData(JSON.stringify(payload));
        setTimeLeft(10);
    }, [location, userData]);

    useEffect(() => {
        const getLocation = () => {
            if (!navigator.geolocation) {
                setError('Biometric Geolocation Unavailable');
                setLoading(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLoading(false);
                },
                (err) => {
                    setError('GPS Uplink Request Denied. Location access required.');
                    setLoading(false);
                },
                { enableHighAccuracy: true }
            );
        };

        getLocation();
        const interval = setInterval(getLocation, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!loading && !error) {
            generatePayload();
            const interval = setInterval(generatePayload, 10000);
            return () => clearInterval(interval);
        }
    }, [loading, error, generatePayload]);

    useEffect(() => {
        if (qrData) {
            const timer = setInterval(() => {
                setTimeLeft(prev => (prev > 0 ? prev - 1 : 10));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [qrData]);

    // Fullscreen toggle for the QR code
    const toggleFullscreen = () => {
        setIsFullscreen(prev => !prev);
    };

    // Exit fullscreen on back button
    useEffect(() => {
        const handleBack = () => {
            if (isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('popstate', handleBack);
        if (isFullscreen) window.history.pushState(null, '', window.location.pathname);
        return () => window.removeEventListener('popstate', handleBack);
    }, [isFullscreen]);

    const formatTime12h = (timeStr) => {
        if (!timeStr) return '--:--';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    };

    if (loading) return <Loader message="Initializing_Encryption_Hub" />;

    // Fullscreen QR view — maximizes the QR for easy scanning
    if (isFullscreen) {
        return (
            <div
                className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center"
                onClick={toggleFullscreen}
            >
                <div className="flex-1 flex items-center justify-center w-full p-6">
                    {qrData ? (
                        <QRCodeSVG
                            value={qrData}
                            size={Math.min(window.innerWidth, window.innerHeight) * 0.85}
                            level="M"
                            includeMargin={true}
                            style={{ maxWidth: '100%', maxHeight: '100%' }}
                        />
                    ) : (
                        <RefreshCw className="animate-spin text-gray-300 w-16 h-16" />
                    )}
                </div>

                {/* Bottom info bar */}
                <div className="w-full bg-black py-4 px-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Activity className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                            ROTATING: {timeLeft}S
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-full bg-white/10 rounded-full h-1 w-20 overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
                                style={{ width: `${(timeLeft / 10) * 100}%` }}
                            />
                        </div>
                    </div>
                    <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Tap to exit</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
            <header className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                    <div className="bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-lg flex items-center space-x-2">
                        <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">Identity Uplink Active</span>
                    </div>
                </div>
                <h1 className="text-4xl font-black italic ">Punch <span className="text-primary italic">Signature</span></h1>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Personnel verification required for gate access</p>
            </header>

            {error ? (
                <div className="glass-card p-10 text-center space-y-6 border-red-500/20 bg-red-500/5 rounded-xl">
                    <div className="relative mx-auto w-20 h-20 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black italic text-red-500">UPLINK FAILED</h3>
                        <p className="text-gray-400 text-xs font-medium leading-relaxed max-w-xs mx-auto">"{error}"</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-slate-800 text-white py-4 rounded-lg font-black tracking-widest text-[10px] border border-white/5 active:scale-95 transition-all"
                    >
                        RETRY CONNECTION
                    </button>
                </div>
            ) : (userData?.startTime && userData?.endTime && (
                new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) < userData.startTime ||
                new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) > userData.endTime
            )) ? (
                <div className="glass-card p-10 text-center space-y-6 border-amber-500/20 bg-amber-500/5 rounded-xl">
                    <div className="relative mx-auto w-20 h-20 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <Clock className="w-10 h-10 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black italic text-amber-500">TEMPORAL LOCK</h3>
                        <p className="text-gray-400 text-xs font-medium leading-relaxed max-w-xs mx-auto uppercase tracking-widest">
                            Site operational window:<br />
                            <span className="text-white font-black">{formatTime12h(userData.startTime)} — {formatTime12h(userData.endTime)}</span>
                        </p>
                    </div>
                    <p className="text-[10px] text-amber-500/50 font-bold uppercase tracking-[0.2em]">Signature hub suspended</p>
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-12">
                    {/* QR Code Display */}
                    <div className="relative group" ref={qrContainerRef}>
                        {/* Outer frame with corner accents */}
                        <div className="absolute -inset-5 pointer-events-none">
                            {/* Top-left corner */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/40 rounded-tl-lg"></div>
                            {/* Top-right corner */}
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/40 rounded-tr-lg"></div>
                            {/* Bottom-left corner */}
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/40 rounded-bl-lg"></div>
                            {/* Bottom-right corner */}
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/40 rounded-br-lg"></div>
                        </div>

                        {/* Side accent glow lines */}
                        <div className="absolute top-0 -left-1.5 w-1 h-12 bg-primary/30 blur-[1px] rounded-full"></div>
                        <div className="absolute -bottom-1.5 right-0 w-12 h-1 bg-primary/30 blur-[1px] rounded-full"></div>

                        {/* QR Code white container */}
                        <div
                            className="bg-white p-6 rounded-xl shadow-[0_0_100px_rgba(59,130,246,0.08)] relative z-10 transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
                            onClick={toggleFullscreen}
                        >
                            {qrData ? (
                                <QRCodeSVG
                                    value={qrData}
                                    size={QR_SIZE}
                                    level="M"
                                    includeMargin={false}
                                />
                            ) : (
                                <div className="flex items-center justify-center" style={{ width: QR_SIZE, height: QR_SIZE }}>
                                    <RefreshCw className="animate-spin text-gray-300 w-10 h-10" />
                                </div>
                            )}

                            {/* Fullscreen hint */}
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </div>
                        </div>

                        {/* Timer badge below QR */}
                        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-center w-full">
                            <div className="inline-flex items-center space-x-3 bg-black/40 backdrop-blur-xl px-5 py-2.5 rounded-xl border border-white/5 shadow-neon">
                                <Activity className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">ROTATING: {timeLeft}S</span>
                                <div className="w-12 bg-white/10 rounded-full h-1 overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
                                        style={{ width: `${(timeLeft / 10) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status cards */}
                    <div className="w-full max-w-sm grid grid-cols-1 gap-4 mt-10">
                        <div className="glass-card p-5 flex items-center justify-between border-white/10 bg-gradient-to-r from-slate-900/40 to-black/40 rounded-xl">
                            <div className="flex items-center space-x-4">
                                <div className="bg-blue-500/10 p-3 rounded-lg">
                                    <Target className="text-blue-500 w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Geo-Fence</p>
                                    <p className="text-sm font-black tracking-tight italic">RADIUS SYNCED</p>
                                </div>
                            </div>
                            <div className="w-2 h-2 rounded-lg bg-blue-500 shadow-neon-blue animate-pulse"></div>
                        </div>

                        <div className="glass-card p-5 flex items-center justify-between border-white/5 bg-gradient-to-r from-slate-900/40 to-black/40 rounded-xl">
                            <div className="flex items-center space-x-4">
                                <div className="bg-secondary/10 p-3 rounded-lg">
                                    <Wifi className="text-secondary w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Network Node</p>
                                    <p className="text-sm font-black tracking-tight italic truncate max-w-[120px]">{userData?.wifiSSID || 'WIFI_LOCKED'}</p>
                                </div>
                            </div>
                            <div className="w-2 h-2 rounded-lg bg-secondary shadow-neon-success animate-pulse"></div>
                        </div>

                        {/* Tap to expand hint */}
                        <button
                            onClick={toggleFullscreen}
                            className="w-full py-3.5 rounded-xl border border-primary/10 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Expand QR for easy scanning</span>
                        </button>
                    </div>

                    <div className="pt-4 flex flex-col items-center space-y-2 opacity-40">
                        <ShieldCheck className="w-5 h-5 text-gray-400" />
                        <p className="text-[8px] text-gray-400 uppercase font-black tracking-[0.4em] text-center">
                            ZinAttend Shield • Node-Secure protocol
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRGenerator;
