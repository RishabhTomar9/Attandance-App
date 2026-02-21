import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Fingerprint, ShieldCheck, Zap, ArrowRight, Sparkles, Activity, Globe, Lock } from 'lucide-react';
import BrandingFooter from '../components/UI/BrandingFooter';


const RoleSelection = () => {
    const navigate = useNavigate();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    return (
        <div className="fixed inset-0 bg-[#030303] flex flex-col items-center justify-center p-5 sm:p-8 select-none touch-none touch-pan-y overflow-hidden">
            <div className={`w-full max-w-lg z-10 flex flex-col h-full max-h-[850px] transition-all duration-1000 ease-out transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>

                {/* Header Section */}
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 sm:space-y-8 py-4">
                    <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-xl">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Secure Attendance</span>
                    </div>

                    <div className="relative group">
                        <div className="relative w-28 h-28 mx-auto">
                            <img
                                src="/icon-512.png"
                                alt="ZinAttend Logo"
                                className="w-full h-full object-contain p-2 rounded-3xl"
                            />
                            <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/40 animate-scan-y shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <h1 className="text-5xl sm:text-7xl font-black text-white">
                            Zin<span className="text-primary italic">Attend</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] sm:text-[11px] font-bold uppercase ">Choose your role to continue</p>
                    </div>
                </div>

                {/* Main Interaction Hub */}
                <div className="flex-[1.5] flex flex-col justify-center space-y-4 sm:space-y-6 px-1">
                    {/* Owner Card */}
                    <button
                        onClick={() => navigate('/login/owner')}
                        className="group relative flex overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.04] backdrop-blur-3xl p-6 sm:p-8 text-left transition-all duration-300 transform active:scale-[0.96] hover:bg-white/[0.08] hover:border-primary/30 outline-none tap-highlight-transparent"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="relative z-10 flex items-center w-full space-x-5 sm:space-x-7">
                            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 flex items-center justify-center shadow-xl group-hover:shadow-primary/20 transition-all">
                                <Briefcase className="w-8 h-8 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase italic mb-1">Owner</h2>
                                <p className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight group-hover:text-gray-300">
                                    Manage your sites and view reports.
                                </p>
                            </div>

                            <div className="shrink-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-white" />
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Employee Card */}
                    <button
                        onClick={() => navigate('/login/employee')}
                        className="group relative flex overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.04] backdrop-blur-3xl p-6 sm:p-8 text-left transition-all duration-300 transform active:scale-[0.96] hover:bg-white/[0.08] hover:border-secondary/30 outline-none tap-highlight-transparent"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="relative z-10 flex items-center w-full space-x-5 sm:space-x-7">
                            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/10 border border-secondary/20 flex items-center justify-center shadow-xl group-hover:shadow-secondary/20 transition-all">
                                <Fingerprint className="w-8 h-8 text-secondary" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase italic mb-1">Employee</h2>
                                <p className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight group-hover:text-gray-300">
                                    Mark attendance and see your history.
                                </p>
                            </div>

                            <div className="shrink-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-secondary/20 transition-all">
                                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-white" />
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Secondary Access Link */}
                    <div className="pt-2">
                        <button
                            onClick={() => navigate('/scanner-login')}
                            className="w-full py-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center space-x-3 group active:bg-white/10 transition-colors"
                        >
                            <ShieldCheck className="w-4 h-4 text-gray-600 group-active:text-primary" />
                            <span className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">Site Scanner Mode</span>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <BrandingFooter className="py-6 sm:py-8" />

            </div>

            <style>{`
                @keyframes scan-y {
                    0% { transform: translateY(0); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(112px); opacity: 0; }
                }
                .animate-scan-y { animation: scan-y 3s ease-in-out infinite; }
                .tap-highlight-transparent { -webkit-tap-highlight-color: transparent; }
            `}</style>
        </div>
    );
};

export default RoleSelection;
