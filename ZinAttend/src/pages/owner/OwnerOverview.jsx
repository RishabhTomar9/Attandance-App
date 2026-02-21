import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Users, CheckCircle, XCircle, Activity, UserPlus, Clock, Percent } from 'lucide-react';
import Loader from '../../components/UI/Loader';

const OwnerOverview = () => {
    const { userData } = useAuth();
    const { showToast } = useUI();
    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        attendanceRate: 0
    });
    const [groupedByEmployee, setGroupedByEmployee] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!userData?.siteId) return;

            try {
                const empQuery = query(collection(db, 'users'), where('siteId', '==', userData.siteId), where('role', '==', 'employee'));
                const empSnapshot = await getDocs(empQuery);
                const total = empSnapshot.size;

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const logsQuery = query(
                    collection(db, 'attendance'),
                    where('siteId', '==', userData.siteId),
                    where('timestamp', '>=', today),
                    orderBy('timestamp', 'desc')
                );
                const logsSnapshot = await getDocs(logsQuery);
                const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const uniquePresent = new Set(logs.map(l => l.employeeId)).size;

                // Calculate late arrivals: first IN per employee after startTime
                let lateCount = 0;
                if (userData.startTime) {
                    const employeeFirstIn = {};
                    const sortedAsc = [...logs].sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
                    sortedAsc.forEach(log => {
                        if (log.type === 'IN' && !employeeFirstIn[log.employeeId]) {
                            employeeFirstIn[log.employeeId] = log;
                        }
                    });
                    Object.values(employeeFirstIn).forEach(log => {
                        const logTime = new Date(log.timestamp.seconds * 1000);
                        const timeStr = logTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                        if (timeStr > userData.startTime) lateCount++;
                    });
                }

                const rate = total > 0 ? Math.round((uniquePresent / total) * 100) : 0;

                setStats({
                    totalEmployees: total,
                    presentToday: uniquePresent,
                    absentToday: Math.max(0, total - uniquePresent),
                    lateToday: lateCount,
                    attendanceRate: rate
                });

                // Group logs by employee for per-person view
                const grouped = {};
                const sortedAscAll = [...logs].sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
                sortedAscAll.forEach(log => {
                    const eid = log.employeeId;
                    if (!grouped[eid]) {
                        grouped[eid] = {
                            employeeId: eid,
                            name: log.name || log.employeeName || eid,
                            logs: []
                        };
                    }
                    grouped[eid].logs.push(log);
                });

                Object.values(grouped).forEach(emp => {
                    const firstIn = emp.logs.find(l => l.type === 'IN');
                    const lastOut = [...emp.logs].reverse().find(l => l.type === 'OUT');
                    const lastLog = emp.logs[emp.logs.length - 1];
                    emp.inTime = firstIn ? new Date(firstIn.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
                    emp.outTime = lastOut ? new Date(lastOut.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
                    emp.isOnSite = lastLog?.type === 'IN';
                    if (firstIn && lastOut) {
                        const diff = lastOut.timestamp.seconds - firstIn.timestamp.seconds;
                        const h = Math.floor(diff / 3600);
                        const m = Math.floor((diff % 3600) / 60);
                        emp.duration = `${h}h ${m}m`;
                    } else if (firstIn) {
                        const diff = Math.floor(Date.now() / 1000) - firstIn.timestamp.seconds;
                        const h = Math.floor(diff / 3600);
                        const m = Math.floor((diff % 3600) / 60);
                        emp.duration = `${h}h ${m}m`;
                    }
                });

                setGroupedByEmployee(grouped);
            } catch (err) {
                console.error(err);
                showToast('Failed to fetch site intel', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [userData]);

    if (loading) return <Loader message="Decrypting_Site_Intel" />;

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };



    const statCards = [
        { label: 'Total Staff', value: stats.totalEmployees, icon: Users, color: 'primary', sub: 'Registered' },
        { label: 'Present', value: stats.presentToday, icon: CheckCircle, color: 'emerald-500', sub: 'On-site' },
        { label: 'Absent', value: stats.absentToday, icon: XCircle, color: 'red-500', sub: 'Off-site' },
        { label: 'Late', value: stats.lateToday, icon: Clock, color: 'amber-500', sub: `After ${userData?.startTime || '09:00'}` },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Greeting Banner */}
            <div className="space-y-1">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{getGreeting()}, Admin</p>
                        <h1 className="text-3xl font-black tracking-tight">Intelligence <span className="text-primary italic">Center</span></h1>
                    </div>
                    <div className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-[10px] font-black text-primary uppercase">Live</span>
                    </div>
                </div>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {/* Attendance Rate Hero */}
            <div className="glass-card p-6 bg-gradient-to-br from-primary/5 via-black/40 to-accent/5 border-white/10 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Percent className="w-28 h-28 text-primary" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Today's Attendance Rate</p>
                        <p className="text-5xl font-black  text-white">{stats.attendanceRate}<span className="text-2xl text-primary ml-1">%</span></p>
                    </div>
                    <div className="text-right space-y-2">
                        <div className="px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 inline-block">
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{stats.presentToday}/{stats.totalEmployees} Active</span>
                        </div>
                        {userData?.startTime && (
                            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Window: {userData.startTime} — {userData.endTime}</p>
                        )}
                    </div>
                </div>
                <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${stats.attendanceRate}%` }}
                    ></div>
                </div>
            </div>

            {/* Stat Grid */}
            <div className="grid grid-cols-2 gap-4">
                {statCards.map((stat, i) => (
                    <div key={i} className="glass-card p-5 relative overflow-hidden group border-white/5 rounded-xl hover:border-white/10 transition-all">
                        <div className={`absolute top-0 left-0 w-1 h-full bg-${stat.color}/30`}></div>
                        <div className="relative z-10 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className={`p-2.5 rounded-xl bg-${stat.color}/10 border border-${stat.color}/20`}>
                                    <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                                </div>
                                <span className={`text-[8px] font-black uppercase text-${stat.color}/80 tracking-widest`}>{stat.sub}</span>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black ">{stat.value}</h3>
                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.15em] mt-0.5">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Per-Employee Activity */}
            <section className="space-y-5">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Staff Activity</h3>
                    </div>
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{Object.keys(groupedByEmployee).length} Employees</span>
                </div>

                <div className="space-y-3">
                    {Object.keys(groupedByEmployee).length > 0 ? Object.values(groupedByEmployee).map(emp => (
                        <div key={emp.employeeId} className="glass-card p-5 border border-white/5 hover:border-white/10 transition-all rounded-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center font-black text-primary border border-white/10 text-sm">
                                            {emp.name?.[0] || 'E'}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center ${emp.isOnSite ? 'bg-emerald-500' : 'bg-accent'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full bg-black ${emp.isOnSite ? 'animate-pulse' : ''}`}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm tracking-tight">{emp.name}</p>
                                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{emp.employeeId}</p>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest ${emp.isOnSite ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-accent/10 border-accent/20 text-accent'}`}>
                                    {emp.isOnSite ? 'On-Site' : 'Left'}
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-3 gap-3">
                                <div>
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">In</p>
                                    <p className="text-sm font-black font-mono  text-emerald-500">{emp.inTime || '--:--'}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Out</p>
                                    <p className="text-sm font-black font-mono  text-accent">{emp.outTime || '--:--'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Duration</p>
                                    <p className="text-sm font-black font-mono  text-white">{emp.duration || '--'}</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="glass-card p-12 text-center space-y-3 border-dashed border-white/10 rounded-xl">
                            <UserPlus className="w-8 h-8 text-gray-700 mx-auto" />
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No activity detected today</p>
                            <p className="text-gray-700 text-[9px] font-medium">Activity will appear as employees punch in</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default OwnerOverview;
