import React from 'react';
import { Activity, ShieldCheck, Cpu, Globe, Target } from 'lucide-react';

const Loader = ({ message = "Initialising_Core_Protocol" }) => {
    return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999] font-mono overflow-hidden select-none touch-none">
            {/* Immersive HUD Container - Responsive Scaling */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
                {/* Central Identity Node */}
                <div className="relative group scale-90 sm:scale-100 transition-transform">
                    <div className="relative w-24 h-24 bg-black/40 border border-white/10 rounded-lg flex items-center justify-center backdrop-blur-2xl shadow-2xl overflow-hidden">
                        {/* High-Fidelity Scanning Beam */}
                        <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent blur-md animate-scanner-line pointer-events-none"></div>
                        <div className="absolute inset-x-0 h-[1.5px] bg-primary animate-scanner-line pointer-events-none"></div>

                        <img src="/icon-512.png" className="w-20 h-20 text-primary drop-shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse" />

                        {/* Precision Micro-Accents */}
                        <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 border-t border-l border-primary/60"></div>
                        <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 border-t border-r border-primary/60"></div>
                        <div className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 border-b border-l border-primary/60"></div>
                        <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 border-b border-r border-primary/60"></div>
                    </div>
                </div>

                {/* Status Informatics */}
                <div className="mt-20 sm:mt-24 text-center space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></div>
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.6em] text-white/90 drop-shadow-sm ml-1">
                                {message.toUpperCase()}
                            </span>
                        </div>
                        <div className="w-40 sm:w-48 h-[1px] bg-white/5 mx-auto rounded-lg overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-progress-flow w-1/2"></div>
                        </div>
                    </div>

                    {/* Matrix Telemetry Grid - Optimized for Vertical Layouts */}
                    <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-2">
                        {[
                            { icon: Cpu, label: 'Node_Sync' },
                            { icon: Globe, label: 'Geo_Link' },
                            { icon: ShieldCheck, label: 'Sec_Auth' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 transition-all active:scale-95">
                                <item.icon className="w-3.5 h-3.5 text-primary/40" />
                                <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest leading-none">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Branding Footer - Tucked for Mobile */}
            <div className="absolute bottom-10 flex flex-col items-center space-y-3 opacity-30 select-none">
                <div className="flex items-center space-x-2.5">
                    <Target className="w-3.5 h-3.5 text-white" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white italic">ZinAttend</span>
                </div>
                <div className="text-[6px] text-gray-500 font-bold uppercase tracking-[0.2em]">Live_Protocol_v2.0</div>
            </div>

            <style>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes reverse-spin { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
                @keyframes spin-very-slow { from { transform: rotate(-45deg); } to { transform: rotate(315deg); } }
                @keyframes pulse-slow { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.2; transform: scale(1.1); } }
                
                .animate-spin-slow { animation: spin-slow 15s linear infinite; }
                .animate-reverse-spin { animation: reverse-spin 10s linear infinite; }
                .animate-spin-very-slow { animation: spin-very-slow 25s linear infinite; }
                .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
                
                @keyframes scanner-line {
                    0% { transform: translateY(-50px); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(50px); opacity: 0; }
                }
                .animate-scanner-line {
                    animation: scanner-line 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    will-change: transform, opacity;
                }

                @keyframes progress-flow {
                    0% { transform: translateX(-150%); }
                    100% { transform: translateX(150%); }
                }
                .animate-progress-flow {
                    animation: progress-flow 2.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                    will-change: transform;
                }
            `}</style>
        </div>
    );
};

export default Loader;


