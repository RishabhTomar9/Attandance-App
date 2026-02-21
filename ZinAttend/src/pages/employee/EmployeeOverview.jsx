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
                        todayIn: inLog ? new Date(inLog.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--',
                        todayOut: outLog ? new Date(outLog.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--',
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12 px-1">
            <header className="space-y-2">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-primary font-black text-[10px] uppercase tracking-[0.3em]">Official Portal</p>
                        <h1 className="text-4xl font-black tracking-tight italic">
                            {userData?.name?.split(' ')[0] || 'Member'} <span className="text-white/40 font-medium not-italic">Hub</span>
                        </h1>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl border backdrop-blur-xl transition-all duration-500 flex items-center space-x-2.5 ${stats.isOnSite ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5 opacity-60'}`}>
                        <div className={`w-2 h-2 rounded-full ${stats.isOnSite ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${stats.isOnSite ? 'text-emerald-500' : 'text-gray-500'}`}>
                            {stats.isOnSite ? 'Active' : 'Offline'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">{userData?.siteName || 'MAIN OFFICE'}</p>
                </div>
            </header>

            {/* Today's Main Card */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[2.5rem] blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative glass-card p-8 bg-black/60 backdrop-blur-3xl rounded-[2.5rem] border-white/5 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                        <Zap className="w-32 h-32 text-primary" />
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-white/40">
                                <Activity className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Today's Activity</span>
                            </div>
                            {stats.totalHours && (
                                <div className="px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{stats.totalHours}</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-8 relative">
                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span>First Punch</span>
                                </p>
                                <p className="text-4xl font-black tracking-tight">{stats.todayIn}</p>
                            </div>
                            <div className="space-y-3 text-right">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-end space-x-2">
                                    <span>Last Punch</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                                </p>
                                <p className="text-4xl font-black tracking-tight">{stats.todayOut}</p>
                            </div>
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-[1px] bg-white/5"></div>
                        </div>

                        <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-gray-600">
                                <Timer className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{stats.punchCount} Swipes Today</span>
                            </div>
                            <div className={`flex items-center space-x-2 px-4 py-2 rounded-2xl border ${stats.isOnSite ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{stats.isOnSite ? 'Verified In' : 'Logged Out'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simple Grid Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Days', value: stats.monthlyAttendance, icon: Calendar, color: 'primary', progress: progressPercentage },
                    { label: 'Hours', value: parseInt(stats.totalHours) || 0, icon: TrendingUp, color: 'accent', progress: Math.min(((parseInt(stats.totalHours) || 0) / 8) * 100, 100) },
                    { label: 'Leaves', value: holidays, icon: Palmtree, color: 'blue-400', progress: Math.min((holidays / 3) * 100, 100) }
                ].map((s, i) => (
                    <div key={i} className="glass-card p-5 rounded-[2rem] border-white/5 bg-black/40 space-y-4 hover:border-white/10 transition-all group">
                        <div className={`w-10 h-10 rounded-2xl bg-${s.color}/10 border border-${s.color}/20 flex items-center justify-center transition-transform group-hover:scale-110`}>
                            <s.icon className={`w-5 h-5 text-${s.color}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-black tracking-tight">{s.value}</p>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-0.5">{s.label}</p>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full bg-${s.color} rounded-full transition-all duration-1000`} style={{ width: `${s.progress}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Simplified activity log */}
            <section className="space-y-6">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Timeline</h3>
                    <div className="h-[1px] flex-1 mx-6 bg-white/5"></div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{todayLogs.length} Events</span>
                </div>

                <div className="space-y-4 relative">
                    <div className="absolute left-9 top-0 bottom-0 w-[1px] bg-white/5"></div>

                    {todayLogs.length > 0 ? todayLogs.map((log, i) => (
                        <div key={i} className="flex items-center space-x-6 group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="relative z-10 shrink-0">
                                <div className={`w-18 h-18 rounded-2xl border-4 border-black flex items-center justify-center transition-all duration-500 shadow-2xl ${log.type === 'OUT' ? 'bg-accent/10 border-accent/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                    <div className={`w-3 h-3 rounded-full ${log.type === 'OUT' ? 'bg-accent' : 'bg-emerald-500'}`}></div>
                                </div>
                            </div>

                            <div className="flex-1 glass-card p-5 bg-black/40 border-white/5 rounded-3xl flex items-center justify-between group-hover:bg-white/[0.03] transition-all group-hover:translate-x-1">
                                <div>
                                    <p className="text-sm font-black tracking-tight text-white uppercase italic">
                                        PUNCH <span className={log.type === 'OUT' ? 'text-accent' : 'text-emerald-500'}>{log.type}</span>
                                    </p>
                                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-1 flex items-center">
                                        <MapPin className="w-2.5 h-2.5 mr-1" />
                                        {log.siteName || 'MAIN PORTAL'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black font-mono text-white/90">
                                        {new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </p>
                                    <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest">GATE VERIFIED</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="glass-card py-20 bg-black/40 border-white/5 border-dashed rounded-[3rem] text-center flex flex-col items-center space-y-4">
                            <Clock className="w-12 h-12 text-white/5" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">No activity detected</p>
                                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest italic">Wait for first punch on device</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};


export default EmployeeOverview;
