import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { db } from '../../firebase/config';
import { MapPin, Wifi, RefreshCw, AlertTriangle, ShieldCheck, Activity, Target, Zap, Clock } from 'lucide-react';
import Loader from '../../components/UI/Loader';

const QRGenerator = () => {
    const { userData } = useAuth();
    const { showToast } = useUI();
    const [qrData, setQrData] = useState(null);
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(15);

    const generatePayload = useCallback(() => {
        if (!location.lat || !location.lng || !userData?.employeeId) return;

        const payload = {
            employeeId: userData.employeeId,
            siteId: userData.siteId,
            timestamp: new Date().toISOString(),
            lat: location.lat,
            lng: location.lng,
            ssid: userData.wifiSSID,
            token: Math.random().toString(36).substring(7)
        };

        setQrData(JSON.stringify(payload));
        setTimeLeft(15);
        showToast('Security token regenerated', 'info');
    }, [location, userData, showToast]);

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
            const interval = setInterval(generatePayload, 15000);
            return () => clearInterval(interval);
        }
    }, [loading, error, generatePayload]);

    useEffect(() => {
        if (qrData) {
            const timer = setInterval(() => {
                setTimeLeft(prev => (prev > 0 ? prev - 1 : 15));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [qrData]);

    if (loading) return <Loader message="Initializing_Encryption_Hub" />;

    return (
        <div className="space-y-10 pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
            <header className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                    <div className="bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-lg flex items-center space-x-2">
                        <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">Identity Uplink Active</span>
                    </div>
                </div>
                <h1 className="text-4xl font-black italic tracking-tighter">Punch <span className="text-primary italic">Signature</span></h1>
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
                            <span className="text-white font-black">{userData.startTime} — {userData.endTime}</span>
                        </p>
                    </div>
                    <p className="text-[10px] text-amber-500/50 font-bold uppercase tracking-[0.2em]">Signature hub suspended</p>
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-12">
                    <div className="relative group">
                        {/* Futuristic Frame Decorations */}
                        <div className="absolute -inset-4 border border-white/5 rounded-xl group-hover:border-primary/20 transition-colors duration-500"></div>
                        <div className="absolute top-0 -left-1 w-2 h-10 bg-primary/40 blur-[2px] rounded-lg"></div>
                        <div className="absolute -bottom-1 right-0 w-10 h-2 bg-primary/40 blur-[2px] rounded-lg"></div>

                        <div className="bg-white p-7 rounded-xl shadow-[0_0_80px_rgba(59,130,246,0.1)] relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
                            {qrData ? (
                                <QRCodeSVG
                                    value={qrData}
                                    size={250}
                                    level="H"
                                    includeMargin={false}
                                />
                            ) : (
                                <div className="w-[250px] h-[250px] flex items-center justify-center bg-gray-50">
                                    <RefreshCw className="animate-spin text-gray-300 w-10 h-10" />
                                </div>
                            )}
                        </div>

                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center w-full space-y-3">
                            <div className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-lg border border-white/5 shadow-neon">
                                <Activity className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">ROTATING: {timeLeft}S</span>
                            </div>
                        </div>
                    </div>

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

                        <div className="glass-card p-5 flex items-center justify-between border-white/5 bg-gradient-to-r from-slate-900/40 to-black/40">
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

