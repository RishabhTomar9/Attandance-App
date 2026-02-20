import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { ShieldCheck, Lock, Zap, Scan, Activity, Eye, EyeOff } from 'lucide-react';

const ScannerLogin = () => {
    const navigate = useNavigate();
    const [siteId, setSiteId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!siteId.trim() || !password.trim()) {
            setError('All fields required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Find site by siteId (document ID)
            const siteRef = doc(db, 'sites', siteId.trim());
            const siteSnap = await getDoc(siteRef);

            if (!siteSnap.exists()) {
                setError('Site not found. Check your Site ID.');
                setLoading(false);
                return;
            }

            const siteData = siteSnap.data();

            if (!siteData.scannerPassword) {
                setError('Scanner password not configured. Ask your admin to set it in Settings.');
                setLoading(false);
                return;
            }

            if (siteData.scannerPassword !== password) {
                setError('Incorrect scanner password.');
                setLoading(false);
                return;
            }

            // Store scanner session
            const scannerSession = {
                siteId: siteData.siteId,
                siteDocId: siteId.trim(),
                siteName: siteData.siteName,
                latitude: siteData.latitude,
                longitude: siteData.longitude,
                geoRadius: siteData.geoRadius,
                wifiSSID: siteData.wifiSSID,
                startTime: siteData.startTime,
                endTime: siteData.endTime,
                ts: Date.now()
            };
            sessionStorage.setItem('scannerSession', JSON.stringify(scannerSession));
            navigate('/scanner');

        } catch (err) {
            console.error(err);
            setError('Connection failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center p-6 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
            </div>

            <div className="w-full max-w-sm relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Logo / Branding */}
                <div className="text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 bg-primary/10 rounded-2xl rotate-45 border border-primary/20"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Scan className="w-9 h-9 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black italic tracking-tighter text-white">Scanner <span className="text-primary">Gate</span></h1>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">Kiosk Mode Authentication</p>
                    </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Site ID</label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                                type="text"
                                value={siteId}
                                onChange={e => setSiteId(e.target.value)}
                                placeholder="Enter site identifier..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Scanner Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter scanner password..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-4 text-sm font-bold text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in duration-300">
                            <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full premium-btn py-4.5 rounded-xl font-black text-[10px] tracking-[0.3em] uppercase text-white disabled:opacity-30 flex items-center justify-center space-x-3 shadow-neon"
                    >
                        {loading ? (
                            <>
                                <Activity className="w-4 h-4 animate-spin" />
                                <span>Authenticating...</span>
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" />
                                <span>Enter Kiosk Mode</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="flex flex-col items-center space-y-2 opacity-30">
                    <ShieldCheck className="w-5 h-5 text-gray-500" />
                    <p className="text-[7px] text-gray-500 uppercase font-black tracking-[0.4em]">ZinAttend Kiosk Protocol</p>
                </div>
            </div>
        </div>
    );
};

export default ScannerLogin;
