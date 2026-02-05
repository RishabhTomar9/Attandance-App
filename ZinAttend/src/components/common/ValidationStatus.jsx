import { Wifi, MapPin, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function ValidationStatus({ status }) {
    if (status.loading) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center space-y-3 min-h-[200px]">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-slate-500 font-medium">Verifying physical presence...</p>
                <p className="text-xs text-slate-400">Checking GPS & Network</p>
            </div>
        );
    }

    if (status.geoError) {
        return (
            <div className="bg-amber-50 p-6 rounded-xl shadow-sm border border-amber-100 flex flex-col items-center justify-center space-y-3">
                <AlertTriangle className="text-amber-600" size={32} />
                <p className="text-amber-800 font-medium">Location Access Required</p>
                <p className="text-sm text-amber-700 text-center">Please enable location services to mark attendance.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                Internal Audit
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-bold">Live</span>
            </h2>

            <div className="space-y-3">
                {/* Location Status */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${status.isWithinRadius ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                            <MapPin size={18} className={status.isWithinRadius ? 'text-emerald-600' : 'text-rose-600'} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Geofence Check</p>
                            <p className="text-xs text-slate-500">
                                {status.distance !== null ? `${status.distance}m from office` : "Calculating..."}
                            </p>
                        </div>
                    </div>
                    <div>
                        {status.isWithinRadius ? (
                            <CheckCircle2 className="text-emerald-500" size={20} />
                        ) : (
                            <XCircle className="text-rose-500" size={20} />
                        )}
                    </div>
                </div>

                {/* Network Status */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${status.isCorrectWiFi ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                            <Wifi size={18} className={status.isCorrectWiFi ? 'text-emerald-600' : 'text-rose-600'} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Network Check</p>
                            <p className="text-xs text-slate-500">
                                {status.isCorrectWiFi ? "Secure connection active" : "Unverified network"}
                            </p>
                        </div>
                    </div>
                    <div>
                        {status.isCorrectWiFi ? (
                            <CheckCircle2 className="text-emerald-500" size={20} />
                        ) : (
                            <XCircle className="text-rose-500" size={20} />
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
