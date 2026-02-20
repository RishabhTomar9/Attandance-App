import React from 'react';
import { Activity, Zap, ShieldCheck } from 'lucide-react';

const Loader = ({ message = "Initializing_ZinAttend_Core" }) => {
    return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999] font-mono overflow-hidden">
            {/* Neural Data Stream - Background Layer */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="h-full w-full bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
            </div>

            {/* Immersive HUD Container */}
            <div className="relative flex flex-col items-center">
                {/* Rotating Tech Rings */}
                <div className="absolute w-[300px] h-[300px] border border-white/5 rounded-lg animate-spin-slow opacity-20"></div>
                <div className="absolute w-[250px] h-[250px] border-t-2 border-b-2 border-primary/20 rounded-lg animate-reverse-spin opacity-40"></div>

                {/* Central Status Node */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/10 rounded-lg blur-2xl animate-pulse"></div>
                    <div className="w-16 h-16 border-2 border-white/10 rounded-lg flex items-center justify-center animate-pulse backdrop-blur-3xl">
                        <Zap className="w-8 h-8 text-primary" />
                    </div>
                </div>

                {/* Progress Data */}
                <div className="mt-12 space-y-4 text-center">
                    <div className="flex items-center justify-center space-x-3 mb-6">
                        <div className="w-2 h-2 bg-primary rounded-lg animate-ping"></div>
                        <span className="text-[12px] font-black uppercase tracking-[0.5em] text-white animate-char-flicker">
                            {message.split('').map((char, i) => (
                                <span key={i} style={{ animationDelay: `${i * 0.05}s` }}>{char}</span>
                            ))}
                        </span>
                    </div>

                    {/* System Telemetry */}
                    <div className="flex space-x-8 opacity-40">
                        <div className="flex flex-col items-center">
                            <span className="text-[7px] text-white uppercase tracking-widest mb-1">Node_Sync</span>
                            <div className="w-8 h-1 bg-white/20 rounded-lg overflow-hidden">
                                <div className="h-full bg-primary animate-timer-drain"></div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[7px] text-white uppercase tracking-widest mb-1">Crypto_Halt</span>
                            <div className="w-8 h-1 bg-white/20 rounded-lg overflow-hidden">
                                <div className="h-full bg-primary animate-pulse w-1/2 mx-auto"></div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[7px] text-white uppercase tracking-widest mb-1">Gate_Auth</span>
                            <ShieldCheck className="w-2 h-2 text-primary" />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes reverse-spin { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
                .animate-spin-slow { animation: spin-slow 15s linear infinite; }
                .animate-reverse-spin { animation: reverse-spin 10s linear infinite; }
                
                @keyframes timer-drain { 0% { width: 0%; } 100% { width: 100%; } }
                .animate-timer-drain { animation: timer-drain 2s ease-in-out infinite; }

                @keyframes char-flicker {
                    0%, 100% { opacity: 1; transform: translateX(0); }
                    10% { opacity: 0.8; transform: translateX(-1px); }
                    20% { opacity: 1; transform: translateX(1px); }
                }

                .animate-char-flicker span {
                    display: inline-block;
                    animation: char-flicker 2s infinite;
                }
            `}</style>
        </div>
    );
};

export default Loader;
