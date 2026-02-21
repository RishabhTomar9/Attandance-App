import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

/**
 * BrandingFooter - A premium, reusable branding component
 * featuring the ZinAttend and Zintrix Technologies credits.
 */
const BrandingFooter = ({ className = "" }) => {
    return (
        <div className={`mt-auto pt-8 pb-4 flex flex-col items-center space-y-5 select-none ${className}`}>
            {/* Security Badge */}
            <div className="flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 opacity-40 hover:opacity-100 transition-all duration-500 group cursor-default">
                <ShieldCheck className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 group-hover:text-white transition-colors">
                    Secured by ZinAttend
                </span>
            </div>

            {/* Divider Dot */}
            <div className="flex items-center space-x-4 opacity-10">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-white"></div>
                <div className="w-1 h-1 rounded-full bg-white"></div>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-white"></div>
            </div>

            {/* Developer Credit */}
            <div className="group flex flex-col items-center space-y-2">
                <p className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center space-x-2">
                    <span className="opacity-40 group-hover:opacity-60 transition-opacity">Powered By</span>
                    <a
                        href='https://zintrixtechnologies.com'
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition-all duration-300 flex items-center space-x-1"
                    >
                        <span className="relative">
                            Zintrix Technologies
                            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-500"></span>
                        </span>
                    </a>
                </p>
                <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-40 transition-opacity duration-700">
                    <span className="text-[7px] text-gray-500 uppercase tracking-widest font-black">Built with</span>
                    <Heart className="w-2 h-2 text-red-500 fill-red-500 animate-pulse" />
                    <span className="text-[7px] text-gray-500 uppercase tracking-widest font-black">for efficiency</span>
                </div>
            </div>
        </div>
    );
};

export default BrandingFooter;
