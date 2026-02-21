import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Clock, Database, History, Calendar as CalendarIcon, ShieldCheck, Zap } from 'lucide-react';
import Loader from '../../components/UI/Loader';

const EmployeeCalendar = () => {
    const { userData } = useAuth();
    const [date, setDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState({});
    const [holidayDates, setHolidayDates] = useState(new Set());
    const [selectedDayLogs, setSelectedDayLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const joiningDate = userData?.createdAt?.seconds
        ? new Date(userData.createdAt.seconds * 1000)
        : null;

    useEffect(() => {
        fetchMonthAttendance();
    }, [date, userData]);

    const fetchMonthAttendance = async () => {
        if (!userData?.employeeId) return;

        setLoading(true);
        try {
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const q = query(
                collection(db, 'attendance'),
                where('employeeId', '==', userData.employeeId),
                where('timestamp', '>=', startOfMonth),
                where('timestamp', '<=', endOfMonth)
            );

            const snapshot = await getDocs(q);
            const logs = snapshot.docs.map(doc => doc.data());

            const dayMap = {};
            logs.forEach(log => {
                const d = new Date(log.timestamp.seconds * 1000).toDateString();
                if (!dayMap[d]) dayMap[d] = [];
                dayMap[d].push(log);
            });

            setAttendanceData(dayMap);
            const currentSelected = date.toDateString();
            setSelectedDayLogs(dayMap[currentSelected] || []);

            // Fetch holidays
            const holQ = query(
                collection(db, 'holidays'),
                where('employeeId', '==', userData.employeeId)
            );
            const holSnap = await getDocs(holQ);
            const holSet = new Set();
            holSnap.docs.forEach(d => {
                const hd = new Date(d.data().date);
                holSet.add(hd.toDateString());
            });
            setHolidayDates(holSet);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const tileClassName = ({ date: tileDate, view }) => {
        if (view !== 'month') return '';
        const d = tileDate.toDateString();
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const isFuture = tileDate > today;
        const isBeforeJoin = joiningDate && tileDate < new Date(joiningDate.getFullYear(), joiningDate.getMonth(), joiningDate.getDate());
        const isSunday = tileDate.getDay() === 0;

        if (isFuture || isBeforeJoin) return 'tile-disabled';
        if (holidayDates.has(d)) return 'tile-holiday';
        if (isSunday) return 'tile-weekend';

        const logs = attendanceData[d];
        if (logs) {
            const hasHalfDay = logs.some(l => l.type === 'HALF DAY');
            const hasIn = logs.some(l => l.type === 'IN');
            const hasOut = logs.some(l => l.type === 'OUT');

            if (hasHalfDay) return 'tile-half';
            if (hasIn && hasOut) return 'tile-present';
            if (hasIn) return 'tile-half'; // Partial day
        }

        // Past working day with no logs = absent
        return 'tile-absent';

    };

    const handleDateChange = (newDate) => {
        setDate(newDate);
        setSelectedDayLogs(attendanceData[newDate.toDateString()] || []);
    };

    return (
        <div className="space-y-8 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
            {loading && <Loader message="Loading_Calendar" />}
            <header className="space-y-2">
                <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 px-3 py-1.5 rounded-2xl border border-primary/20">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">History Log</span>
                </div>
                <h1 className="text-4xl font-black italic ">Work <span className="text-primary italic">Record</span></h1>
            </header>


            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-accent/10 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative glass-card p-4 sm:p-8 calendar-container bg-black/60 backdrop-blur-3xl rounded-[2.5rem] border-white/5 shadow-2xl overflow-hidden">
                    <Calendar
                        onChange={handleDateChange}
                        value={date}
                        tileClassName={tileClassName}
                        prevLabel={<div className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-primary/10 hover:text-primary transition-all"><ChevronLeft className="w-5 h-5 mx-auto" /></div>}
                        nextLabel={<div className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-primary/10 hover:text-primary transition-all"><ChevronRight className="w-5 h-5 mx-auto" /></div>}
                        next2Label={null}
                        prev2Label={null}
                        formatShortWeekday={(locale, date) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                    />

                    {/* Legend Grid */}
                    <div className="grid grid-cols-4 gap-2 mt-10 pt-8 border-t border-white/5">
                        {[
                            { label: 'Full', cls: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' },
                            { label: 'Half', cls: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' },
                            { label: 'Miss', cls: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' },
                            { label: 'Off', cls: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' },
                        ].map((l, i) => (
                            <div key={i} className="flex flex-col items-center space-y-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${l.cls}`}></div>
                                <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest">{l.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center space-x-3 text-white/40">
                        <History className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Daily Details</span>
                    </div>
                    <div className="h-[1px] flex-1 mx-6 bg-white/5"></div>
                    <div className="px-4 py-1.5 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-black font-mono text-gray-400">
                            {date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {holidayDates.has(date.toDateString()) ? (
                        <div className="glass-card p-8 rounded-[2.5rem] border-blue-500/10 bg-blue-500/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:scale-110 transition-transform">
                                <Palmtree className="w-24 h-24 text-blue-500" />
                            </div>
                            <div className="flex items-center space-x-6">
                                <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
                                    <CalendarIcon className="text-blue-500 w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-sm uppercase tracking-wider text-blue-400">Leave Day</p>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic leading-relaxed">System recorded holiday or sabbatical</p>
                                </div>
                            </div>
                        </div>
                    ) : selectedDayLogs.length > 0 ? (() => {
                        const sorted = [...selectedDayLogs].sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
                        const firstIn = sorted.find(l => l.type === 'IN' || l.type === 'HALF DAY');
                        const lastOut = [...sorted].reverse().find(l => l.type === 'OUT');
                        const firstInTime = firstIn ? new Date(firstIn.timestamp.seconds * 1000) : null;
                        const lastOutTime = lastOut ? new Date(lastOut.timestamp.seconds * 1000) : null;

                        let hoursWorked = null;
                        if (firstInTime && lastOutTime) {
                            const diffMs = lastOutTime - firstInTime;
                            hoursWorked = `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`;
                        }

                        return (
                            <div className="glass-card p-8 border-white/5 bg-black/40 rounded-[2.5rem] relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20"></div>

                                <div className="space-y-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-5">
                                            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                                                <Zap className="text-emerald-500 w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-[9px] tracking-[0.2em] text-gray-500 uppercase">Start Point</p>
                                                <p className="font-black text-2xl text-white tracking-tight">
                                                    {firstInTime ? firstInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] text-emerald-500 font-black uppercase tracking-[.3em] mb-1">GATE_OK</span>
                                            <div className="h-1 w-8 bg-emerald-500/30 rounded-full"></div>
                                        </div>
                                    </div>

                                    <div className="relative flex items-center px-4">
                                        <div className="flex-1 h-px bg-white/5"></div>
                                        {hoursWorked ? (
                                            <div className="mx-6 px-5 py-2 bg-primary/10 rounded-2xl border border-primary/20 shadow-lg group-hover:scale-110 transition-transform">
                                                <span className="text-xs font-black text-primary uppercase italic tracking-widest">{hoursWorked} Worked</span>
                                            </div>
                                        ) : (
                                            <div className="mx-6 w-2 h-2 rounded-full bg-white/5"></div>
                                        )}
                                        <div className="flex-1 h-px bg-white/5"></div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-5">
                                            <div className="bg-accent/10 p-4 rounded-2xl border border-accent/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                                                <Clock className="text-accent w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-[9px] tracking-[0.2em] text-gray-500 uppercase">End Point</p>
                                                <p className="font-black text-2xl text-white tracking-tight">
                                                    {lastOutTime ? lastOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end opacity-40">
                                            <span className="text-[8px] text-accent font-black uppercase tracking-[.3em] mb-1">EXIT_LOG</span>
                                            <div className="h-1 w-8 bg-accent/30 rounded-full"></div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
                                        <div className="flex items-center space-x-2 text-gray-600">
                                            <ShieldCheck className="w-4 h-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">{sorted.length} Events Logged</p>
                                        </div>
                                        <p className="text-[9px] text-primary/60 font-black uppercase tracking-[0.2em] bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                                            {firstIn?.siteName || 'MAIN PORTAL'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="flex flex-col items-center justify-center py-20 glass-card bg-black/40 border-dashed border-white/5 rounded-[2.5rem]">
                            <History className="w-12 h-12 text-white/5 mb-4" />
                            <div className="space-y-1 text-center">
                                <p className="text-[11px] font-black text-gray-700 uppercase tracking-[0.4em]">Null Response</p>
                                <p className="text-[9px] text-gray-800 font-bold uppercase tracking-widest italic">No operational data for this date</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>


            <style>{`
                .react-calendar {
                    width: 100%;
                    background: transparent;
                    border: none;
                    font-family: inherit;
                    color: white;
                }
                .react-calendar__navigation {
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                }
                .react-calendar__navigation button {
                    color: white;
                    min-width: 44px;
                    background: none;
                    font-size: 1.1rem;
                    font-weight: 900;
                    font-style: italic;
                    text-transform: uppercase;
                    letter-spacing: -0.02em;
                }
                .react-calendar__navigation button:hover, .react-calendar__navigation button:focus {
                    background: rgba(255,255,255,0.03);
                    border-radius: 16px;
                }
                .react-calendar__month-view__weekdays {
                    font-weight: 900;
                    color: #475569;
                    text-decoration: none;
                    margin-bottom: 1rem;
                    font-size: 0.7rem;
                    letter-spacing: 0.2em;
                }
                .react-calendar__month-view__weekdays__weekday abbr {
                    text-decoration: none;
                }
                .react-calendar__month-view__days__day {
                    color: #475569;
                    padding: 0.6rem 0;
                    font-weight: 700;
                    font-size: 0.85rem;
                }
                .react-calendar__tile {
                    background: none;
                    border-radius: 12px;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .react-calendar__month-view__days__day--neighboringMonth {
                    opacity: 0.15;
                }
                .react-calendar__tile:enabled:hover {
                    background: rgba(59, 130, 246, 0.1);
                    color: white;
                }
                .react-calendar__tile--now {
                    border: 2px solid rgba(255,255,255,0.15) !important;
                    color: white !important;
                    font-weight: 900;
                }
                .react-calendar__tile--active {
                    background: var(--color-primary) !important;
                    color: white !important;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
                    font-weight: 900;
                }

                /* Colored tile backgrounds */
                .tile-present {
                    background: rgba(16, 185, 129, 0.2) !important;
                    color: #10b981 !important;
                    font-weight: 900;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }
                .tile-half {
                    background: rgba(245, 158, 11, 0.2) !important;
                    color: #f59e0b !important;
                    font-weight: 900;
                    border: 1px solid rgba(245, 158, 11, 0.3);
                }
                .tile-absent {
                    background: rgba(239, 68, 68, 0.15) !important;
                    color: #ef4444 !important;
                    font-weight: 800;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .tile-holiday {
                    background: rgba(96, 165, 250, 0.2) !important;
                    color: #60a5fa !important;
                    font-weight: 900;
                    border: 1px solid rgba(96, 165, 250, 0.3);
                }
                .tile-weekend {
                    color: #334155 !important;
                    opacity: 0.5;
                }
                .tile-disabled {
                    color: #1e293b !important;
                    opacity: 0.3;
                }

                /* Override active for colored tiles */
                .react-calendar__tile--active.tile-present,
                .react-calendar__tile--active.tile-half,
                .react-calendar__tile--active.tile-absent,
                .react-calendar__tile--active.tile-holiday {
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
                    border: 2px solid var(--color-primary) !important;
                }
            `}</style>
        </div>
    );
};

export default EmployeeCalendar;
