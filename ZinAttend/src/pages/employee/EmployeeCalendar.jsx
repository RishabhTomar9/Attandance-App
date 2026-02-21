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
            const hasIn = logs.some(l => l.type === 'IN');
            const hasOut = logs.some(l => l.type === 'OUT');
            if (hasIn && hasOut) return 'tile-present';
            if (hasIn) return 'tile-half';
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
                <div className="inline-flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                    <Database className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Attendance Log</span>
                </div>
                <h1 className="text-4xl font-black italic ">My <span className="text-primary italic">Calendar</span></h1>
                {joiningDate && (
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Since {joiningDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                )}
            </header>

            <div className="glass-card p-6 calendar-container bg-black/40 backdrop-blur-2xl border-white/5 ring-1 ring-white/10 shadow-neon-soft rounded-xl">
                <Calendar
                    onChange={handleDateChange}
                    value={date}
                    tileClassName={tileClassName}
                    prevLabel={<ChevronLeft className="w-5 h-5 mx-auto text-primary" />}
                    nextLabel={<ChevronRight className="w-5 h-5 mx-auto text-primary" />}
                    next2Label={null}
                    prev2Label={null}
                    formatShortWeekday={(locale, date) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                />

                {/* Inline Legend */}
                <div className="flex items-center justify-center space-x-5 mt-6 pt-4 border-t border-white/5">
                    {[
                        { label: 'Present', cls: 'bg-emerald-500' },
                        { label: 'Half', cls: 'bg-amber-500' },
                        { label: 'Absent', cls: 'bg-red-500' },
                        { label: 'Leave', cls: 'bg-blue-500' },
                    ].map((l, i) => (
                        <div key={i} className="flex items-center space-x-1.5">
                            <div className={`w-2 h-2 rounded-full ${l.cls}`}></div>
                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{l.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="font-black italic text-xl flex items-center tracking-tight">
                        <History className="w-5 h-5 mr-3 text-primary" />
                        Day Summary
                    </h3>
                    <div className="bg-white/5 px-4 py-1.5 rounded-xl border border-white/10">
                        <span className="text-[10px] font-black font-mono text-gray-400">
                            {date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {holidayDates.has(date.toDateString()) ? (
                        <div className="glass-card p-6 rounded-xl border-blue-500/20 bg-blue-500/5">
                            <div className="flex items-center space-x-4">
                                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                    <CalendarIcon className="text-blue-500 w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-black text-sm uppercase tracking-wider text-blue-500">Leave Day</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Marked by admin</p>
                                </div>
                            </div>
                        </div>
                    ) : selectedDayLogs.length > 0 ? (() => {
                        const sorted = [...selectedDayLogs].sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
                        const firstIn = sorted.find(l => l.type === 'IN');
                        const lastOut = [...sorted].reverse().find(l => l.type === 'OUT');
                        const firstInTime = firstIn ? new Date(firstIn.timestamp.seconds * 1000) : null;
                        const lastOutTime = lastOut ? new Date(lastOut.timestamp.seconds * 1000) : null;

                        let hoursWorked = null;
                        if (firstInTime && lastOutTime) {
                            const diffMs = lastOutTime - firstInTime;
                            hoursWorked = `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`;
                        }

                        return (
                            <div className="glass-card p-6 border-white/10 bg-gradient-to-br from-slate-900/50 via-black/40 to-slate-900/50 relative overflow-hidden rounded-xl">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                                <Zap className="text-emerald-500 w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black italic text-[9px] tracking-[0.2em] text-gray-500 uppercase">First Punch-In</p>
                                                <p className="font-black text-lg text-white font-mono ">
                                                    {firstInTime ? firstInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[8px] text-emerald-500 uppercase font-black tracking-widest">Verified</span>
                                        </div>
                                    </div>

                                    <div className="relative flex items-center">
                                        <div className="flex-1 border-t border-dashed border-white/5"></div>
                                        {hoursWorked && (
                                            <div className="mx-4 px-4 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">{hoursWorked} Total</span>
                                            </div>
                                        )}
                                        <div className="flex-1 border-t border-dashed border-white/5"></div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-accent/10 p-3 rounded-xl border border-accent/20">
                                                <Clock className="text-accent w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black italic text-[9px] tracking-[0.2em] text-gray-500 uppercase">Last Punch-Out</p>
                                                <p className="font-black text-lg text-white font-mono ">
                                                    {lastOutTime ? lastOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                                </p>
                                            </div>
                                        </div>
                                        {lastOut && (
                                            <div className="flex items-center space-x-1.5 bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                                                <ShieldCheck className="w-3 h-3 text-accent" />
                                                <span className="text-[8px] text-accent uppercase font-black tracking-widest">Verified</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{sorted.length} Total Punches</p>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{firstIn?.siteName || 'MAIN PORTAL'}</p>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="flex flex-col items-center justify-center py-12 glass-card bg-white/2 border-dashed border-white/10 rounded-xl">
                            <CalendarIcon className="w-10 h-10 text-gray-800 mb-3" />
                            <p className="text-gray-600 font-bold italic tracking-tight text-sm">No activity on this day</p>
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
