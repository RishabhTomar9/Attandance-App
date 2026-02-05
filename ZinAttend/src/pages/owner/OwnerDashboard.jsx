import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { Users, Building2, TrendingUp, AlertCircle, RefreshCw, UserCog, UserPlus, ArrowRight, Clock } from "lucide-react";

const OwnerDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        employees: 0,
        managers: 0,
        activeNow: 0,
        lateToday: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState([]);

    const loadDashboardData = async () => {
        if (!user.siteId) return;
        setLoading(true);
        try {
            // 1. Fetch Users Stats
            const usersQ = query(collection(db, "users"), where("siteId", "==", user.siteId));
            const usersSnap = await getDocs(usersQ);
            let empCount = 0;
            let mgrCount = 0;
            usersSnap.forEach(doc => {
                const data = doc.data();
                if (data.role === 'employee') empCount++;
                if (data.role === 'manager') mgrCount++;
            });

            // 2. Fetch Today's Attendance for "Active Now"
            const todayStr = new Date().toISOString().split('T')[0];
            const attendanceQ = query(
                collection(db, "attendance"),
                where("siteId", "==", user.siteId),
                where("date", "==", todayStr)
            );
            const attSnap = await getDocs(attendanceQ);
            let activeCount = 0;
            let lateCount = 0; // Logic for late needs 'shift start time', assume 9am for demo or field check? 
            // For now, let's just count logic simplistically if status == 'late' (if we had that logic)
            // Or just 'active sessions'

            attSnap.forEach(doc => {
                const d = doc.data();
                if (!d.checkOut) activeCount++;
                if (d.status === 'late') lateCount++;
            });

            setStats({
                employees: empCount,
                managers: mgrCount,
                activeNow: activeCount,
                lateToday: lateCount
            });

            // 3. Recent Activity (Last 5 check-ins)
            // Note: Requires composite index if we sort by date + filter by site.
            // Simplified: Fetch recent today.
            const recentQ = query(
                collection(db, "attendance"),
                where("siteId", "==", user.siteId),
                orderBy("checkIn", "desc"),
                limit(5)
            );
            // This might fail if index is missing. If so, fail gracefully.
            try {
                const recentSnap = await getDocs(recentQ);
                // Need to fetch user names? Map UID to name? 
                // Ideally attendance doc has redundant 'userName' for easy display, or we lookup.
                // Let's rely on cached users logic or just display UID for MVP speed if name missing?
                // Better: Attendance hook didn't save userName. Let's just show check-in time and "User".
                // Optimally we save snapshot. 
                const activityData = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRecentActivity(activityData);
            } catch (err) {
                console.warn("Recent activity fetch failed (likely index):", err);
            }

        } catch (error) {
            console.error("Dashboard load failed", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadDashboardData();
    }, [user.siteId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Site Overview</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Live Data</span>
                    <button onClick={loadDashboardData} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <RefreshCw size={16} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Employees"
                    value={stats.employees}
                    icon={<Users className="text-blue-600" />}
                    link="/owner/employees"
                />
                <StatCard
                    title="Active Managers"
                    value={stats.managers}
                    icon={<UserCog className="text-purple-600" />}
                    link="/owner/managers"
                />
                <StatCard
                    title="Online Now"
                    value={stats.activeNow}
                    icon={<Clock className="text-emerald-600" />}
                    subColor="text-emerald-600"
                />
                <StatCard
                    title="Late Arrivals"
                    value={stats.lateToday}
                    icon={<AlertCircle className="text-amber-600" />}
                    subColor="text-amber-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Quick Actions">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <QuickAction
                                to="/owner/employees"
                                icon={<UserPlus className="text-blue-600" />}
                                title="Invite Employee"
                                desc="Add new staff to the roster"
                            />
                            <QuickAction
                                to="/owner/managers"
                                icon={<UserCog className="text-purple-600" />}
                                title="Manage Team Leads"
                                desc="Promote managers & admins"
                            />
                            <QuickAction
                                to="/owner/reports"
                                icon={<TrendingUp className="text-emerald-600" />}
                                title="View Attendance Reports"
                                desc="Export timesheets & analytics"
                            />
                            <QuickAction
                                to="/owner/settings"
                                icon={<Building2 className="text-slate-600" />}
                                title="Site Settings"
                                desc="Update location & WiFi rules"
                            />
                        </div>
                    </Card>

                    <Card title="Recent Activity">
                        {recentActivity.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No recent activity detected.</p>
                        ) : (
                            <div className="space-y-4">
                                {recentActivity.map(act => (
                                    <div key={act.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                <Clock size={16} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">New Check-In</p>
                                                <p className="text-xs text-slate-500">User ID: {act.userId?.substring(0, 6)}...</p>
                                            </div>
                                        </div>
                                        <span className="text-sm text-slate-600 font-mono">
                                            {act.checkIn ? new Date(act.checkIn.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg">
                        <h3 className="font-bold text-lg mb-2">Pro Tip</h3>
                        <p className="text-slate-300 text-sm mb-4">
                            Ensure your site's WiFi and location coordinates are up to date in settings to prevent clock-in errors.
                        </p>
                        <Link to="/owner/settings" className="text-blue-400 text-sm font-medium hover:text-blue-300 flex items-center gap-1">
                            Go to Settings <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, link, subColor }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${subColor || 'text-slate-800'}`}>{value}</p>
            {link && <Link to={link} className="absolute inset-0 z-10" />}
        </div>
        <div className="p-3 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">
            {icon}
        </div>
    </div>
);

const QuickAction = ({ to, icon, title, desc }) => (
    <Link to={to} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all bg-white group">
        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-100">
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{title}</h4>
            <p className="text-xs text-slate-500 mt-1">{desc}</p>
        </div>
    </Link>
);

export default OwnerDashboard;
