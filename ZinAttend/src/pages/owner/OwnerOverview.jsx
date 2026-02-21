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
                    const firstIn = emp.logs.find(l => l.type === 'IN' || l.type === 'HALF DAY');
                    const lastOut = [...emp.logs].reverse().find(l => l.type === 'OUT');
                    const lastLog = emp.logs[emp.logs.length - 1];
                    emp.inTime = firstIn ? new Date(firstIn.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
                    emp.outTime = lastOut ? new Date(lastOut.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
                    emp.isLate = firstIn?.type === 'HALF DAY';
                    emp.isOnSite = lastLog?.type === 'IN' || lastLog?.type === 'HALF DAY';

                    if (firstIn && lastOut) {
                        const diff = lastOut.timestamp.seconds - firstIn.timestamp.seconds;
                        const h = Math.floor(diff / 3600);
                        const m = Math.floor((diff % 3600) / 60);
                        emp.duration = `${h}h ${m}m`;
                    } else if (emp.isOnSite) {
                        const diff = Math.floor(Date.now() / 1000) - firstIn.timestamp.seconds;
                        const h = Math.floor(diff / 3600);
                        const m = Math.floor((diff % 3600) / 60);
                        emp.duration = `${h}h ${m}m`;
                    }
                });

                setGroupedByEmployee(grouped);
            } catch (err) {
                console.error(err);
                showToast('Failed to load stats', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [userData]);


    const formatTime12h = (timeStr) => {
        if (!timeStr) return '--:--';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    };

    if (loading) return <Loader message="Loading Overview..." />;

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
        { label: 'Late', value: stats.lateToday, icon: Clock, color: 'amber-500', sub: `After ${formatTime12h(userData?.startTime) || '09:00 AM'}` },
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
            <header className="space-y-4 px-1">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <Activity className="w-3.5 h-3.5 text-primary" />
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">{getGreeting()}</p>
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tight">Admin <span className="text-white/40 not-italic">Overview</span></h1>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </header>

            {/* Attendance Rate Card */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
                <div className="glass-card p-10 bg-black/60 backdrop-blur-3xl rounded-lg border-white/5 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 transition-transform group-hover:scale-110">
                        <Percent className="w-32 h-32 text-primary" />
                    </div>

                    <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Attendance Rate</p>
                                <p className="text-6xl font-black text-white italic">{stats.attendanceRate}<span className="text-3xl text-primary not-italic">%</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-white">{stats.presentToday}<span className="text-lg text-gray-700 mx-1">/</span>{stats.totalEmployees}</p>
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Staff Present</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="h-2 bg-white/5 rounded-lg overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-lg transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                    style={{ width: `${stats.attendanceRate}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[8px] font-black text-gray-600 uppercase tracking-widest">
                                <span>Progress</span>
                                <span className="text-primary">{stats.attendanceRate}% Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stat Grid */}
            <div className="grid grid-cols-2 gap-4">
                {statCards.map((stat, i) => (
                    <div key={i} className="glass-card p-6 rounded-lg border-white/5 bg-black/40 hover:bg-white/[0.03] transition-all group overflow-hidden relative">
                        <div className="relative z-10 space-y-4">
                            <div className={`p-3 rounded-lg bg-${stat.color}/10 border border-${stat.color}/20 transition-transform group-hover:scale-110`}>
                                <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                            </div>
                            <div>
                                <h3 className="text-4xl font-black text-white italic tracking-tight">{stat.value}</h3>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detailed Staff Activity */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Today's Activity</h3>
                    <div className="h-[1px] flex-1 mx-6 bg-white/5"></div>
                    <span className="bg-primary/10 px-3 py-1 rounded-full text-[9px] font-black text-primary uppercase">{Object.keys(groupedByEmployee).length} Detected</span>
                </div>

                <div className="space-y-4">
                    {Object.keys(groupedByEmployee).length > 0 ? Object.values(groupedByEmployee).map((emp, i) => (
                        <div key={emp.employeeId} className="glass-card p-6 bg-black/40 border-white/5 rounded-lg hover:bg-white/[0.03] transition-all group animate-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-5">
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-primary text-xl shadow-2xl group-hover:scale-105 transition-transform">
                                            {emp.name?.[0] || 'E'}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-black shadow-lg ${emp.isOnSite ? 'bg-emerald-500' : 'bg-red-500 opacity-40'}`}></div>
                                    </div>
                                    <div>
                                        <p className="font-black text-lg tracking-tight text-white">{emp.name}</p>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">#{emp.employeeId}</p>
                                            {emp.isLate && (
                                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[7px] font-black rounded-lg border border-amber-500/20 italic">HALF DAY</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={`flex flex-col items-end space-y-1`}>
                                    <span className={`text-[9px] font-black uppercase tracking-widest p-2 rounded-xl border ${emp.isOnSite ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-white/5 border-white/5 text-gray-600'}`}>
                                        {emp.isOnSite ? 'On-Site' : 'Offline'}
                                    </span>
                                    {emp.duration && <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{emp.duration}</p>}
                                </div>
                            </div>

                            <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-2 gap-8 relative">
                                <div className="space-y-1">
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest italic flex items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mr-2"></div>
                                        First Entry
                                    </p>
                                    <p className="text-lg font-black font-mono text-emerald-500/80">{emp.inTime || '--:--'}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest italic flex items-center justify-end">
                                        Last Exit
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent/40 ml-2"></div>
                                    </p>
                                    <p className="text-lg font-black font-mono text-accent/80">{emp.outTime || '--:--'}</p>
                                </div>
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 h-full py-4 h-8">
                                    <div className="w-px h-full bg-white/5"></div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-24 glass-card bg-black/40 border-dashed border-white/5 rounded-lg text-center space-y-6 flex flex-col items-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                                <UserPlus className="w-10 h-10 text-white/5" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[12px] font-black text-gray-600 uppercase tracking-[0.4em]">No activity yet</p>
                                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest italic">Employee activity will appear here</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default OwnerOverview;
