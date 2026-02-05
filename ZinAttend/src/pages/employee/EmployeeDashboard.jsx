import { useContext } from "react";
import { useAuth } from "../../context/AuthContext";
import useAttendance from "../../hooks/useAttendance";
import ValidationStatus from "../../components/common/ValidationStatus";
import UserQrCode from "../../components/common/UserQrCode";
import Card from "../../components/ui/Card";
import { Clock, MapPin, Coffee, AlertCircle, CheckCircle, ScanFace, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function EmployeeDashboard() {
    const { user } = useAuth();
    const {
        loading,
        todayRecord,
        history,
        clockIn,
        clockOut,
        validationStatus
    } = useAttendance(user);

    // ... re-implement logic ...
    const isClockedIn = !!todayRecord && !todayRecord.punchOut;
    const isDayComplete = !!todayRecord && !!todayRecord.punchOut;
    const canAction = validationStatus.isWithinRadius && validationStatus.isCorrectWiFi;

    // Check Biometric Status
    const isFaceRegistered = user.faceRegistered;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Attendance</h1>
                    <p className="text-slate-500">Welcome back, {user.name}</p>
                </div>
                {/* Status Badge */}
                <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 text-sm font-medium ${!isFaceRegistered ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    (canAction || isClockedIn ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800')
                    }`}>
                    {!isFaceRegistered ? <><ScanFace size={16} /> Setup Required</> :
                        isDayComplete ? <><CheckCircle size={16} /> Day Complete</> :
                            isClockedIn ? <><Clock size={16} /> Currently Working</> :
                                canAction ? <><CheckCircle size={16} /> Eligible to Clock In</> :
                                    <><AlertCircle size={16} /> Action Required</>}
                </div>
            </div>

            {/* Biometric Warning Banner */}
            {!isFaceRegistered && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <ScanFace size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Biometric Setup Required</h3>
                            <p className="text-blue-100 text-sm">You must register your Face ID to mark attendance.</p>
                        </div>
                    </div>
                    <Link to="/employee/register-face" className="px-6 py-2 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2">
                        Setup Now <ArrowRight size={16} />
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col - Identity & Validation */}
                <div className="lg:col-span-1 space-y-6">
                    {/* QR Code - Only show if registered */}
                    {isFaceRegistered ? (
                        <UserQrCode />
                    ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl h-64 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                            <ScanFace size={48} className="mb-2 opacity-50" />
                            <p className="font-medium text-slate-500">Identity Locked</p>
                            <p className="text-xs mt-1">Complete enrollment to view your Secure QR Badge.</p>
                        </div>
                    )}

                    <ValidationStatus status={validationStatus} />

                    {/* Manual Override - Disabled if no biometrics? Yes. */}
                    {!isDayComplete && isFaceRegistered && (
                        <div className="text-center">
                            <p className="text-xs text-slate-400 mb-2">- OR -</p>
                            <button
                                onClick={isClockedIn ? clockOut : clockIn}
                                disabled={!canAction && !isClockedIn}
                                className={`w-full py-3 rounded-xl font-bold shadow-md transition-all ${isClockedIn
                                    ? 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed'
                                    }`}
                            >
                                {isClockedIn ? "Manual Check Out" : "Manual Check In"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Col - Stats & History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            title="Arrival"
                            value={todayRecord?.punchIn ? new Date(todayRecord.punchIn.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                            subtext="Today"
                            icon={<Clock className="text-emerald-600" />}
                        />
                        <StatCard
                            title="Duration"
                            value={isClockedIn ? "Tracking..." : (todayRecord?.punchOut ? "Shift Done" : "--")}
                            subtext="Active Time"
                            icon={<Coffee className="text-indigo-600" />}
                        />
                        <StatCard
                            title="Status"
                            value={todayRecord?.status || "Absent"}
                            subtext={todayRecord?.punchOut ? "Completed" : "Active"}
                            icon={<MapPin className="text-blue-600" />}
                        />
                    </div>

                    <Card title="Attendance History">
                        {history.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No history yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2">In</th>
                                            <th className="px-4 py-2">Out</th>
                                            <th className="px-4 py-2">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(r => (
                                            <tr key={r.id} className="border-t border-slate-100">
                                                <td className="px-4 py-2">{r.date || r.id.split('_')[1]}</td>
                                                <td className="px-4 py-2">{r.punchIn ? new Date(r.punchIn.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="px-4 py-2">{r.punchOut ? new Date(r.punchOut.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="px-4 py-2 capitalize flex items-center gap-1">
                                                    {r.status}
                                                    {r.logs?.some(l => l.biometric) && <ScanFace size={12} className="text-emerald-500" title="Biometric Verified" />}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ title, value, subtext, icon }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
            <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-800 truncate">{value}</p>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);
