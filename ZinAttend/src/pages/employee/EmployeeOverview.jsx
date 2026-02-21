import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Clock, Calendar, Zap, TrendingUp, Activity, MapPin, Timer, CheckCircle, ShieldCheck, Palmtree } from 'lucide-react';
import Loader from '../../components/UI/Loader';

const EmployeeOverview = () => {
    const { userData } = useAuth();
    const { showToast } = useUI();
    const [todayLogs, setTodayLogs] = useState([]);
    const [stats, setStats] = useState({
        todayIn: '--:--',
        todayOut: '--:--',
        totalHours: null,
        monthlyAttendance: 0,
        weeklyHours: 0,
        punchCount: 0,
        isOnSite: false
    });
    const [holidays, setHolidays] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userData?.employeeId) return;

            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const q = query(
                    collection(db, 'attendance'),
                    where('employeeId', '==', userData.employeeId),
                    where('timestamp', '>=', today),
                    orderBy('timestamp', 'asc')
                );
                const snapshot = await getDocs(q);
                const logs = snapshot.docs.map(doc => doc.data());
                setTodayLogs(logs);

                if (logs.length > 0) {
                    const inLog = logs.find(l => l.type === 'IN');
                    const outLog = [...logs].reverse().find(l => l.type === 'OUT');
                    const lastLog = logs[logs.length - 1];

                    // Calculate hours worked
                    let totalHours = null;
                    if (inLog && outLog) {
                        const inTime = new Date(inLog.timestamp.seconds * 1000);
                        const outTime = new Date(outLog.timestamp.seconds * 1000);
                        const diffMs = outTime - inTime;
                        const hours = Math.floor(diffMs / 3600000);
                        const mins = Math.floor((diffMs % 3600000) / 60000);
                        totalHours = `${hours}h ${mins}m`;
                    } else if (inLog) {
                        const inTime = new Date(inLog.timestamp.seconds * 1000);
                        const diffMs = Date.now() - inTime.getTime();
                        const hours = Math.floor(diffMs / 3600000);
                        const mins = Math.floor((diffMs % 3600000) / 60000);
                        totalHours = `${hours}h ${mins}m`;
                    }

                    setStats(prev => ({
                        ...prev,
                        todayIn: inLog ? new Date(inLog.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
                        todayOut: outLog ? new Date(outLog.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
                        totalHours,
                        punchCount: logs.length,
                        isOnSite: lastLog?.type === 'IN'
                    }));
                }

                // Monthly attendance
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const mq = query(
                    collection(db, 'attendance'),
                    where('employeeId', '==', userData.employeeId),
                    where('timestamp', '>=', startOfMonth)
                );
                const mSnapshot = await getDocs(mq);
                const uniqueDays = new Set(mSnapshot.docs.map(doc => {
                    const timestamp = doc.data().timestamp;
                    if (!timestamp) return null;
                    const date = new Date(timestamp.seconds * 1000);
                    return date.toDateString();
                }).filter(d => d !== null)).size;

                setStats(prev => ({
                    ...prev,
                    monthlyAttendance: uniqueDays
                }));

                // Fetch holidays
                const holQ = query(
                    collection(db, 'holidays'),
                    where('employeeId', '==', userData.employeeId)
                );
                const holSnap = await getDocs(holQ);
                const monthHols = holSnap.docs.filter(d => {
                    const hDate = new Date(d.data().date);
                    return hDate.getMonth() === new Date().getMonth() && hDate.getFullYear() === new Date().getFullYear();
                });
                setHolidays(monthHols.length);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userData]);
    // Calculate working days this month from joining date
    const today = new Date();
    const dayOfMonth = today.getDate();
    const joiningDate = userData?.createdAt?.seconds ? new Date(userData.createdAt.seconds * 1000) : null;
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const countFrom = joiningDate && joiningDate > monthStart ? joiningDate : monthStart;

    let workingDaysInMonth = 0;
    for (let d = new Date(countFrom); d <= today; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) workingDaysInMonth++; // exclude Sundays
    }

    const progressPercentage = workingDaysInMonth > 0 ? (stats.monthlyAttendance / workingDaysInMonth) * 100 : 0;

    if (loading) return <Loader message="Retrieving_Personnel_Data" />;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <header className="space-y-1">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">Welcome back</p>
                        <h1 className="text-3xl font-black tracking-tight">{userData?.name?.split(' ')[0] || 'Agent'} <span className="text-secondary italic">Hub</span></h1>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 ${stats.isOnSite ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-gray-500/10 border-gray-500/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${stats.isOnSite ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${stats.isOnSite ? 'text-emerald-500' : 'text-gray-500'}`}>{stats.isOnSite ? 'On-Site' : 'Off-Site'}</span>
                    </div>
                </div>
                <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">{userData?.siteName || userData?.siteId} • {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            </header>

            {/* Today's Punch Card */}
            <div className="glass-card p-6 bg-gradient-to-br from-slate-900/40 via-black/40 to-slate-900/40 relative overflow-hidden ring-1 ring-white/5 rounded-xl border-white/10">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Zap className="w-28 h-28 text-secondary rotate-12" />
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-secondary" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Today's Session</h3>
                        </div>
                        {stats.totalHours && (
                            <div className="px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">{stats.totalHours} {stats.isOnSite ? 'Running' : 'Total'}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-gray-500">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Check-In</span>
                            </div>
                            <p className="text-4xl font-black ">{stats.todayIn}</p>
                        </div>
                        <div className="space-y-2 text-right">
                            <div className="flex items-center space-x-2 justify-end text-gray-500">
                                <span className="text-[9px] font-black uppercase tracking-widest">Check-Out</span>
                                <Clock className="w-3.5 h-3.5 text-accent" />
                            </div>
                            <p className="text-4xl font-black ">{stats.todayOut}</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <div className="flex items-center space-x-2">
                            <Timer className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{stats.punchCount} Punches Today</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg border ${stats.isOnSite ? 'bg-emerald-500/10 border-emerald-500/20' : stats.punchCount > 0 ? 'bg-accent/10 border-accent/20' : 'bg-gray-500/10 border-gray-500/20'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${stats.isOnSite ? 'text-emerald-500' : stats.punchCount > 0 ? 'text-accent' : 'text-gray-500'}`}>
                                {stats.isOnSite ? 'Session Active' : stats.punchCount > 0 ? 'Session Closed' : 'Not Started'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-4 space-y-3 border border-blue-500/10 hover:border-blue-500/20 transition-all rounded-xl">
                    <div className="p-2 rounded-xl bg-blue-500/10 w-fit border border-blue-500/20">
                        <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black ">{stats.monthlyAttendance}</h4>
                        <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Days</p>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(progressPercentage, 100)}%` }}></div>
                    </div>
                </div>

                <div className="glass-card p-4 space-y-3 border border-accent/10 hover:border-accent/20 transition-all rounded-xl">
                    <div className="p-2 rounded-xl bg-accent/10 w-fit border border-accent/20">
                        <TrendingUp className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black ">{stats.totalHours || '0h'}</h4>
                        <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Hours</p>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(((parseInt(stats.totalHours) || 0) / 8) * 100, 100)}%` }}></div>
                    </div>
                </div>

                <div className="glass-card p-4 space-y-3 border border-blue-400/10 hover:border-blue-400/20 transition-all rounded-xl">
                    <div className="p-2 rounded-xl bg-blue-400/10 w-fit border border-blue-400/20">
                        <Palmtree className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black ">{holidays}</h4>
                        <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Leaves</p>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min((holidays / 3) * 100, 100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Today's Activity Log */}
            <section className="space-y-5">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-secondary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Today's Log</h3>
                    </div>
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{todayLogs.length} Events</span>
                </div>

                <div className="space-y-3">
                    {todayLogs.length > 0 ? todayLogs.map((log, i) => (
                        <div key={i} className="glass-card p-4 flex items-center justify-between border border-white/5 hover:border-white/10 transition-all rounded-xl">
                            <div className="flex items-center space-x-4">
                                <div className={`p-2.5 rounded-xl border ${log.type === 'IN' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-accent/10 border-accent/20'}`}>
                                    <Zap className={`w-4 h-4 ${log.type === 'IN' ? 'text-emerald-500' : 'text-accent'}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold tracking-tight">Punch <span className={log.type === 'IN' ? 'text-emerald-500' : 'text-accent'}>{log.type}</span></p>
                                    <div className="flex items-center space-x-1 mt-0.5">
                                        <MapPin className="w-2.5 h-2.5 text-gray-600" />
                                        <p className="text-[9px] font-bold text-gray-600 truncate max-w-[120px] uppercase tracking-widest">{log.siteName || 'Site'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-sm font-black text-white font-mono ">
                                    {new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </p>
                                <div className="flex items-center justify-end space-x-1">
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                                    <p className="text-[8px] text-emerald-500 uppercase font-black tracking-widest">Verified</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="glass-card p-12 text-center space-y-4 border-dashed border-white/5 bg-transparent rounded-xl">
                            <Clock className="w-10 h-10 text-gray-800 mx-auto" />
                            <div className="space-y-1">
                                <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">No Activity Yet</p>
                                <p className="text-gray-700 text-[9px] font-medium">Generate your QR code to punch in</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default EmployeeOverview;
