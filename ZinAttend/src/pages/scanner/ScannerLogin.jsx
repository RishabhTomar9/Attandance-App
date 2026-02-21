import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { ShieldCheck, Lock, Zap, Scan, Activity, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import BrandingFooter from '../../components/UI/BrandingFooter';


/**
 * ScannerLogin - Simplified Language
 */
const ScannerLogin = () => {
    const navigate = useNavigate();
    const [siteId, setSiteId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!siteId.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const siteRef = doc(db, 'sites', siteId.trim());
            const siteSnap = await getDoc(siteRef);

            if (!siteSnap.exists()) {
                setError('Site not found');
                setLoading(false);
                return;
            }

            const siteData = siteSnap.data();

            if (!siteData.scannerPassword) {
                setError('Password not set up for this site');
                setLoading(false);
                return;
            }

            if (siteData.scannerPassword !== password) {
                setError('Incorrect password');
                setLoading(false);
                return;
            }

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
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#030303] flex flex-col items-center justify-center p-5 sm:p-8 overflow-hidden font-sans selection:bg-primary/30">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full h-full bg-primary/5 rounded-full blur-[150px] animate-pulse-slow"></div>
            </div>

            <div className={`w-full max-w-md relative z-10 transition-all duration-1000 ease-out transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>

                {/* Back Portal */}
                <button
                    onClick={() => navigate('/login')}
                    className="group flex items-center space-x-3 text-gray-500 hover:text-white mb-8 sm:mb-12 transition-all active:scale-95 tap-highlight-transparent"
                >
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-active:bg-primary/20">
                        <ArrowLeft className="w-5 h-5 group-active:-translate-x-1 transition-transform" />
                    </div>
                </button>

                {/* Header Branding */}
                <div className="text-center space-y-6 sm:space-y-8 mb-10 sm:mb-14">
                    <div className="relative w-24 h-24 mx-auto group">
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-primary/20 blur-2xl rounded-full opacity-50"></div>
                        <div className="relative w-full h-full bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                            <Scan className="w-10 h-10 text-primary animate-pulse" />
                            <div className="absolute inset-x-0 top-0 h-[2px] bg-primary shadow-[0_0_15px_rgba(59,130,246,1)] animate-card-scan"></div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl font-black italic  text-white">
                            Site <span className="text-primary not-italic">Scanner</span>
                        </h1>
                        <p className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-[0.4em] leading-relaxed">
                            Sign in to kiosk mode
                        </p>
                    </div>
                </div>

                {/* Auth Module */}
                <div className="relative group p-0.5 sm:p-1 rounded-[2.5rem]">
                    <div className="absolute inset-0 bg-primary/10 blur-2xl opacity-40"></div>

                    <div className="glass-card p-8 sm:p-10 relative overflow-hidden rounded-[2.5rem] border-white/10 bg-black/40 backdrop-blur-3xl">
                        <form onSubmit={handleLogin} className="space-y-6 sm:space-y-8">
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Site ID</label>
                                <div className="flex items-center space-x-3 sm:space-x-4">
                                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <ShieldCheck className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <input
                                        type="text"
                                        value={siteId}
                                        onChange={e => setSiteId(e.target.value)}
                                        placeholder="Enter site id..."
                                        className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-5 py-5 font-bold text-white placeholder-gray-700 focus:outline-none focus:border-primary/40 transition-all text-sm tracking-wide"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Password</label>
                                <div className="flex items-center space-x-3 sm:space-x-4">
                                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <Lock className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div className="flex-1 relative flex items-center">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 pr-14 py-5 font-bold text-white placeholder-gray-700 focus:outline-none focus:border-primary/40 transition-all text-sm tracking-widest leading-none"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 w-10 h-10 flex items-center justify-center text-gray-600 active:text-white transition-colors z-20">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/10 rounded-2xl text-center">
                                    <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 rounded-2xl bg-white text-black font-black text-[11px] tracking-[0.25em] uppercase flex items-center justify-center space-x-4 active:scale-[0.97] transition-all disabled:opacity-30 shadow-2xl"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 fill-black" />
                                        <span>Enter Scanner</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <BrandingFooter />

            </div>

            <style>{`
                .tap-highlight-transparent { -webkit-tap-highlight-color: transparent; }
                @keyframes card-scan {
                    0% { transform: translateY(0); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(96px); opacity: 0; }
                }
                .animate-card-scan { animation: card-scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
            `}</style>
        </div>
    );
};

export default ScannerLogin;
