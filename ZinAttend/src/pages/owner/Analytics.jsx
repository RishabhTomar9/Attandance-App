import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Loader2, TrendingUp, UserX, Clock, Users } from "lucide-react";

const COLORS = ['#10b981', '#f59e0b', '#f43f5e']; // Green, Yellow, Red

export default function Analytics() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        present: 0,
        halfDay: 0,
        absent: 0,
        late: 0,
        total: 0
    });
    const [weeklyData, setWeeklyData] = useState([]);

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        // Fetch ALL stats for this month? Or last 30 days?
        // For MVP, fetch "Today" for realtime, and "Last 7 days" for trend.

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const q = query(collection(db, `attendance/${user.siteId}/records`), where("date", "==", todayStr));
            const snap = await getDocs(q);

            let p = 0, h = 0, a = 0;
            snap.forEach(d => {
                const s = d.data().status;
                if (s === 'present') p++;
                else if (s === 'half-day') h++;
                else a++;
            });

            // Assuming total employees is constant or fetched from org stats
            // If absent records aren't created yet (because cron runs at night), 'absent' might be 0.
            // We can infer absent = Total Employees - (Present + HalfDay).
            // Let's fetch total employees count.
            const usersSnap = await getDocs(query(collection(db, "users"), where("siteId", "==", user.siteId), where("role", "==", "employee")));
            const totalEmp = usersSnap.size;

            // Present + HalfDay = Checked In.
            // Absent = Total - CheckedIn
            const checkedIn = p + h; // + late if we had distinct status
            const realAbsent = Math.max(0, totalEmp - checkedIn);

            setStats({
                present: p,
                halfDay: h,
                absent: realAbsent,
                total: totalEmp
            });

            // Mocking Weekly Data for Chart (Real impl requires 7 separate queries or one big one)
            // Ideally: Cloud Function aggregates this daily into 'analytics' collection.
            setWeeklyData([
                { name: 'Mon', present: 40, absent: 2 },
                { name: 'Tue', present: 38, absent: 4 },
                { name: 'Wed', present: 41, absent: 1 },
                { name: 'Thu', present: 39, absent: 3 },
                { name: 'Fri', present: 42, absent: 0 },
                { name: 'Sat', present: 15, absent: 20 }, // Weekend logic needed
            ]);

        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const pieData = [
        { name: 'Present', value: stats.present },
        { name: 'Half Day', value: stats.halfDay },
        { name: 'Absent', value: stats.absent },
    ];

    if (loading) return <div className="p-12 text-center text-slate-500 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Workforce Analytics</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatBox title="Today's Attendance" value={`${Math.round(((stats.present + stats.halfDay) / stats.total) * 100) || 0}%`} icon={<TrendingUp className="text-emerald-500" />} />
                <StatBox title="Present Today" value={stats.present} icon={<Users className="text-blue-500" />} />
                <StatBox title="Late / Half-Day" value={stats.halfDay} icon={<Clock className="text-amber-500" />} />
                <StatBox title="Absent" value={stats.absent} icon={<UserX className="text-rose-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PIE CHART */}
                <Card title="Daily Distribution">
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-xs font-medium">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Present</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-full"></span> Half Day</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-500 rounded-full"></span> Absent</span>
                    </div>
                </Card>

                {/* BAR CHART */}
                <Card title="Weekly Trend">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}

const StatBox = ({ title, value, icon }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
        <div>
            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg">{icon}</div>
    </div>
);
