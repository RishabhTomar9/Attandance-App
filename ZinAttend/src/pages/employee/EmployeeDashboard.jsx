import { useContext } from "react";
import { useAuth } from "../../context/AuthContext";
import useAttendance from "../../hooks/useAttendance";
import ValidationStatus from "../../components/common/ValidationStatus";
import UserQrCode from "../../components/common/UserQrCode"; // Added
import Card from "../../components/ui/Card";
import { Clock, MapPin, Coffee, AlertCircle, CheckCircle, LogOut, History, Calendar } from "lucide-react";

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

    // ... rest of logic (timer etc) kept same ...
    // Re-implementing timer logic for brevity in this replace
    const isClockedIn = !!todayRecord && !todayRecord.checkOut;
    const isDayComplete = !!todayRecord && !!todayRecord.checkOut;
    const canAction = validationStatus.isWithinRadius && validationStatus.isCorrectWiFi;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Attendance</h1>
                    <p className="text-slate-500">Welcome back, {user.name}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 text-sm font-medium ${canAction || isClockedIn ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                    {isDayComplete ? <><CheckCircle size={16} /> Day Complete</> :
                        isClockedIn ? <><Clock size={16} /> Currently Working</> :
                            canAction ? <><CheckCircle size={16} /> Eligible to Clock In</> :
                                <><AlertCircle size={16} /> Action Required</>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col - Identity & Validation */}
                <div className="lg:col-span-1 space-y-6">
                    {/* NEW: QR Code Card */}
                    <UserQrCode />

                    <ValidationStatus status={validationStatus} />

                    {/* Clock In Button (Alternative manual method) */}
                    {/* Hidden if QR Only mode, but we keep both for flexibility as per prompt implies "QR +... = Punch" */}
                    {/* For now, we keep manual button, but display QR as "Badge" */}

                    {!isDayComplete && (
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
                            value={todayRecord?.checkIn ? new Date(todayRecord.checkIn.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                            subtext="Today"
                            icon={<Clock className="text-emerald-600" />}
                        />
                        <StatCard
                            title="Duration"
                            value={isClockedIn ? "Tracking..." : (todayRecord?.checkOut ? "Shift Done" : "--")}
                            subtext="Active Time"
                            icon={<Coffee className="text-indigo-600" />}
                        />
                        <StatCard
                            title="Status"
                            value={todayRecord?.status || "Absent"}
                            subtext={todayRecord?.checkOut ? "Completed" : "Active"}
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
                                            <th className="px-4 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(r => (
                                            <tr key={r.id} className="border-t border-slate-100">
                                                <td className="px-4 py-2">{r.date}</td>
                                                <td className="px-4 py-2">{r.checkIn ? new Date(r.checkIn.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="px-4 py-2">{r.checkOut ? new Date(r.checkOut.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="px-4 py-2 capitalize">{r.status}</td>
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
