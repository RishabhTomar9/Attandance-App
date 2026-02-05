import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { Users, Clock, AlertTriangle, FileBarChart, CheckCircle, Ban } from "lucide-react";

const ManagerDashboard = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [todayRecords, setTodayRecords] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.siteId) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            // 1. Fetch Request: All Employees in Site
            const usersQ = query(
                collection(db, "users"),
                where("siteId", "==", user.siteId),
                where("role", "==", "employee")
            );

            // 2. Fetch Request: Today's Attendance Records
            const todayStr = new Date().toISOString().split('T')[0];
            const attendanceQ = query(
                collection(db, `attendance/${user.siteId}/records`),
                where("date", "==", todayStr)
            );

            // Execute Parallel
            const [usersSnap, attendSnap] = await Promise.all([
                getDocs(usersQ),
                getDocs(attendanceQ)
            ]);

            // Process Users
            const empList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setEmployees(empList);

            // Process Attendance (Map by UID for easy lookup)
            const recordMap = {};
            attendSnap.forEach(d => {
                const data = d.data();
                recordMap[data.uid] = data;
            });
            setTodayRecords(recordMap);

        } catch (error) {
            console.error("Error loading dashboard:", error);
        }
        setLoading(false);
    };

    // Calculate Stats
    const totalEmployees = employees.length;
    const presentCount = Object.keys(todayRecords).length;
    // const pendingCount = employees.filter(e => e.status === 'pending').length; // If we had pending approval status

    // Derived Attendance List
    const attendanceRowData = employees.map(emp => {
        const record = todayRecords[emp.id];
        return {
            uid: emp.id,
            name: emp.name,
            email: emp.email,
            status: record?.status || 'absent',
            punchIn: record?.punchIn,
            punchOut: record?.punchOut,
            isLate: record?.status === 'late',
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Employee Overview</h1>
                <p className="text-slate-500">Manager Dashboard</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Team"
                    value={totalEmployees}
                    icon={<Users className="text-blue-600" />}
                />
                <StatCard
                    title="Present Today"
                    value={presentCount}
                    icon={<Clock className="text-emerald-600" />}
                />
                <StatCard
                    title="Absent / Pending"
                    value={totalEmployees - presentCount}
                    icon={<AlertTriangle className="text-amber-600" />}
                />
            </div>

            <Card title="Today's Attendance">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading live data...</div>
                ) : attendanceRowData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No employees found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Punch In</th>
                                    <th className="px-6 py-4">Punch Out</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {attendanceRowData.map(row => (
                                    <tr key={row.uid} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-slate-800">{row.name}</p>
                                                <p className="text-xs text-slate-400">{row.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${row.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                                                    row.status === 'half-day' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                }`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                            {row.punchIn ? new Date(row.punchIn.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                            {row.punchOut ? new Date(row.punchOut.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

const StatCard = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
            {icon}
        </div>
    </div>
);

export default ManagerDashboard;
