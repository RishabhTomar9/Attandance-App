import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, AlertTriangle, Palmtree, Plus, Trash2, User, ShieldCheck, ChevronDown, Zap } from 'lucide-react';
import Loader from '../../components/UI/Loader';

// Custom Dropdown Component
const CustomDropdown = ({ value, onChange, options, placeholder }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const selected = options.find(o => o.value === value);

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-left hover:border-white/20 transition-colors focus:border-primary/50 focus:ring-4 focus:ring-primary/5 focus:outline-none">
                <span className={selected ? 'text-white' : 'text-gray-500'}>{selected ? selected.label : placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-card border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.map(opt => (
                        <button key={opt.value} type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full px-4 py-3 text-left text-sm font-bold flex items-center space-x-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${value === opt.value ? 'text-primary bg-primary/5' : 'text-gray-300'}`}>
                            {opt.icon && <span className="text-lg">{opt.icon}</span>}
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const leaveReasons = [
    { value: 'Sick Leave', label: 'Sick Leave', icon: '🤒' },
    { value: 'Personal Leave', label: 'Personal Leave', icon: '🏠' },
    { value: 'Vacation', label: 'Vacation', icon: '✈️' },
    { value: 'Emergency', label: 'Emergency', icon: '🚨' },
    { value: 'Festival', label: 'Festival', icon: '🎉' },
    { value: 'Other', label: 'Other', icon: '📝' },
];

const EmployeeDetail = () => {
    const { employeeDocId } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const { showToast, confirm } = useUI();

    const [employee, setEmployee] = useState(null);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [holidayDateSet, setHolidayDateSet] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [holidayForm, setHolidayForm] = useState({ date: '', reason: '' });
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [selectedDayLogs, setSelectedDayLogs] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        fetchAll();
    }, [employeeDocId, calendarDate]);

    const fetchAll = async () => {
        if (!employeeDocId) return;
        setLoading(true);
        try {
            const empDoc = await getDoc(doc(db, 'users', employeeDocId));
            if (!empDoc.exists()) { navigate(-1); return; }
            const empData = { id: empDoc.id, ...empDoc.data() };
            setEmployee(empData);

            // Attendance for month
            const startOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
            const endOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0, 23, 59, 59);

            const attQ = query(
                collection(db, 'attendance'),
                where('employeeId', '==', empData.employeeId),
                where('timestamp', '>=', startOfMonth),
                where('timestamp', '<=', endOfMonth)
            );
            const attSnap = await getDocs(attQ);
            const logs = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAttendanceLogs(logs);

            // Build day map
            const dayMap = {};
            logs.forEach(log => {
                const d = new Date(log.timestamp.seconds * 1000).toDateString();
                if (!dayMap[d]) dayMap[d] = [];
                dayMap[d].push(log);
            });
            setAttendanceMap(dayMap);

            // Selected day
            setSelectedDayLogs(dayMap[selectedDate.toDateString()] || []);

            // Holidays
            const holQ = query(
                collection(db, 'holidays'),
                where('employeeId', '==', empData.employeeId),
                where('siteId', '==', userData?.siteId)
            );
            const holSnap = await getDocs(holQ);
            const hols = holSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setHolidays(hols);
            const holSet = new Set();
            hols.forEach(h => holSet.add(new Date(h.date).toDateString()));
            setHolidayDateSet(holSet);

        } catch (err) {
            console.error(err);
            showToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDateSelect = (newDate) => {
        setSelectedDate(newDate);
        setSelectedDayLogs(attendanceMap[newDate.toDateString()] || []);
    };

    const joiningDate = employee?.createdAt?.seconds
        ? new Date(employee.createdAt.seconds * 1000)
        : null;

    const tileClassName = ({ date: tileDate, view }) => {
        if (view !== 'month') return '';
        const d = tileDate.toDateString();
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const isFuture = tileDate > today;
        const isBeforeJoin = joiningDate && tileDate < new Date(joiningDate.getFullYear(), joiningDate.getMonth(), joiningDate.getDate());
        const isSunday = tileDate.getDay() === 0;

        if (isFuture || isBeforeJoin) return 'tile-disabled';
        if (holidayDateSet.has(d)) return 'tile-holiday';
        if (isSunday) return 'tile-weekend';

        const logs = attendanceMap[d];
        if (logs) {
            const hasFull = logs.some(l => l.type === 'IN') && logs.some(l => l.type === 'OUT');
            const hasHalf = logs.some(l => l.type === 'HALF DAY') || (logs.some(l => l.type === 'IN') && !logs.some(l => l.type === 'OUT'));
            if (hasFull) return 'tile-present';
            if (hasHalf) return 'tile-half';
        }
        return 'tile-absent';
    };


    const addHoliday = async () => {
        if (!holidayForm.date) return;
        try {
            await addDoc(collection(db, 'holidays'), {
                employeeId: employee.employeeId,
                employeeName: employee.name,
                siteId: userData.siteId,
                date: holidayForm.date,
                reason: holidayForm.reason || 'Leave',
                createdAt: serverTimestamp(),
                addedBy: 'owner'
            });
            showToast('Holiday recorded', 'success');
            setShowHolidayModal(false);
            setHolidayForm({ date: '', reason: '' });
            fetchAll();
        } catch (err) {
            showToast('Failed to add holiday', 'error');
        }
    };

    const removeHoliday = async (id) => {
        const ok = await confirm({
            title: 'Remove Holiday',
            message: 'This will remove the recorded holiday entry. Continue?',
            danger: true, confirmText: 'REMOVE', cancelText: 'KEEP'
        });
        if (!ok) return;
        try {
            await deleteDoc(doc(db, 'holidays', id));
            showToast('Holiday removed', 'success');
            fetchAll();
        } catch (err) {
            showToast('Failed to remove', 'error');
        }
    };

    if (loading) return <Loader message="Loading_Profile" />;
    if (!employee) return null;

    // Monthly stats
    const today = new Date();
    const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
    let presentCount = 0, absentCount = 0, halfDayCount = 0;
    const monthHolidayDates = holidays
        .filter(h => {
            const hd = new Date(h.date);
            return hd.getMonth() === calendarDate.getMonth() && hd.getFullYear() === calendarDate.getFullYear();
        });

    const joinStart = joiningDate
        ? new Date(joiningDate.getFullYear(), joiningDate.getMonth(), joiningDate.getDate())
        : null;

    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
        if (d > today) continue;
        if (joinStart && d < joinStart) continue; // skip days before joining
        const dayStr = d.toDateString();
        const isWeekend = d.getDay() === 0;
        const isHoliday = monthHolidayDates.some(h => new Date(h.date).getDate() === day);
        if (isHoliday || isWeekend) continue;

        const dayLogs = attendanceLogs.filter(l => new Date(l.timestamp.seconds * 1000).toDateString() === dayStr);
        const hasFull = dayLogs.some(l => l.type === 'IN') && dayLogs.some(l => l.type === 'OUT');
        const hasHalf = dayLogs.some(l => l.type === 'HALF DAY') || (dayLogs.some(l => l.type === 'IN') && !dayLogs.some(l => l.type === 'OUT'));

        if (hasFull) presentCount++;
        else if (hasHalf) halfDayCount++;
        else absentCount++;
    }


    // Selected day detail
    const sorted = [...selectedDayLogs].sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
    const firstIn = sorted.find(l => l.type === 'IN');
    const lastOut = [...sorted].reverse().find(l => l.type === 'OUT');
    const selectedIsHoliday = holidayDateSet.has(selectedDate.toDateString());
    const selectedHolidayInfo = holidays.find(h => new Date(h.date).toDateString() === selectedDate.toDateString());

    let duration = null;
    if (firstIn && lastOut) {
        const diff = lastOut.timestamp.seconds - firstIn.timestamp.seconds;
        duration = `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16">
            {/* Nav Header */}
            <div className="flex items-center justify-between px-1">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center space-x-2.5 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95 group"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:-translate-x-1 transition-all" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white">Back</span>
                </button>
                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Staff Member</p>
                    <p className="text-[8px] font-bold text-primary uppercase tracking-[0.2em]">{employee.employeeId}</p>
                </div>
            </div>

            {/* Premium Profile Header */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="glass-card p-10 bg-black/60 rounded-lg border-white/5 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform duration-1000">
                        <ShieldCheck className="w-48 h-48 text-primary" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center sm:flex-row sm:items-start space-y-8 sm:space-y-0 sm:space-x-10 text-center sm:text-left">
                        <div className="relative shrink-0">
                            <div className="w-32 h-32 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-5xl text-primary overflow-hidden shadow-2xl p-1">
                                {employee.photoURL ? <img src={employee.photoURL} alt="" className="w-full h-full object-cover rounded-lg" /> : employee.name?.[0]}
                            </div>
                            <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-lg border-[4px] border-black shadow-2xl flex items-center justify-center ${employee.isLinked ? 'bg-secondary' : 'bg-amber-500'}`}>
                                <Zap className="w-5 h-5 text-black" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight italic text-white uppercase">{employee.name}</h1>
                                <p className="text-gray-500 font-bold text-[15px] mt-1">{employee.email}</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                                <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                    <div className={`w-2 h-2 rounded-full ${employee.isLinked ? 'bg-secondary animate-pulse' : 'bg-amber-500'}`}></div>
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{employee.isLinked ? 'Active' : 'Inactive'}</span>
                                </div>
                                <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                    <Clock className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Joined {new Date(employee.createdAt?.seconds * 1000).getFullYear()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Premium Stat Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Present', value: presentCount, color: 'emerald-400', icon: CheckCircle, sub: 'Days On-Site' },
                    { label: 'Absent', value: absentCount, color: 'rose-500', icon: XCircle, sub: 'Missed Shifts' },
                    { label: 'Half Day', value: halfDayCount, color: 'amber-500', icon: AlertTriangle, sub: 'Partial Cycles' },
                    { label: 'Leaves', value: monthHolidayDates.length, color: 'sky-500', icon: Palmtree, sub: 'Approved' }
                ].map((s, i) => (
                    <div key={i} className="glass-card p-6 bg-black/40 border-white/5 rounded-lg hover:bg-white/[0.03] transition-all group relative overflow-hidden">
                        <div className="relative z-10 space-y-4">
                            <div className={`p-3 rounded-lg bg-${s.color.split('-')[0]}-500/10 border border-${s.color.split('-')[0]}-500/20 w-fit`}>
                                <s.icon className={`w-5 h-5 text-${s.color}`} />
                            </div>
                            <div>
                                <p className="text-4xl font-black text-white italic tracking-tight">{s.value}</p>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">{s.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>


            {/* Section Controls */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-3">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Attendance History</h3>
                </div>
                <button
                    onClick={() => setShowHolidayModal(true)}
                    className="flex items-center space-x-2.5 px-6 py-3 rounded-lg bg-primary text-white font-black italic text-[10px] tracking-widest uppercase shadow-[0_0_25px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Leave</span>
                </button>
            </div>


            {/* Calendar View */}
            <div className="glass-card p-8 bg-black/40 rounded-lg border border-white/5 relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] -rotate-12">
                    <CalendarIcon className="w-64 h-64 text-white" />
                </div>

                <div className="relative z-10">
                    <Calendar
                        onChange={handleDateSelect}
                        value={selectedDate}
                        onActiveStartDateChange={({ activeStartDate }) => setCalendarDate(activeStartDate)}
                        tileClassName={tileClassName}
                        prevLabel={<ChevronLeft className="w-6 h-6 mx-auto text-primary" />}
                        nextLabel={<ChevronRight className="w-6 h-6 mx-auto text-primary" />}
                        next2Label={null}
                        prev2Label={null}
                        formatShortWeekday={(locale, date) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                    />

                    {/* Inline Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-8 border-t border-white/5">
                        {[
                            { label: 'Present', cls: 'bg-emerald-500' },
                            { label: 'Partial', cls: 'bg-amber-500' },
                            { label: 'Absent', cls: 'bg-red-500' },
                            { label: 'Holiday', cls: 'bg-sky-500' },
                        ].map((l, i) => (
                            <div key={i} className="flex items-center space-x-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${l.cls} shadow-lg shadow-${l.cls.split('-')[1]}-500/20`}></div>
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{l.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            {/* Day Intel Summary */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Day Sequence</h3>
                    <div className="h-[1px] flex-1 mx-6 bg-white/5"></div>
                    <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/5 font-mono text-[9px] font-black text-gray-500 uppercase tracking-widest italic">
                        {selectedDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                </div>

                {selectedIsHoliday ? (
                    <div className="glass-card p-8 rounded-lg bg-sky-500/5 border-sky-500/10 flex items-center space-x-6">
                        <div className="shrink-0 w-16 h-16 bg-sky-500/10 rounded-lg flex items-center justify-center border border-sky-500/20">
                            <Palmtree className="text-sky-500 w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-2xl font-black italic text-white uppercase tracking-tight">Leave Day</p>
                            <p className="text-[10px] text-sky-500/60 font-black uppercase tracking-[0.2em] mt-1">Reason: {selectedHolidayInfo?.reason || 'Scheduled Holiday'}</p>
                        </div>
                    </div>
                ) : selectedDayLogs.length > 0 ? (
                    <div className="glass-card p-10 bg-black/40 rounded-lg border border-white/5 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50"></div>

                        <div className="relative z-10 space-y-10">
                            <div className="grid grid-cols-2 gap-10 sm:gap-20">
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span>In Time</span>
                                    </div>
                                    <p className="text-4xl font-black text-white font-mono tracking-tighter">
                                        {firstIn ? new Date(firstIn.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                                    </p>
                                </div>
                                <div className="space-y-2 text-right">
                                    <div className="flex items-center justify-end space-x-2.5 text-[10px] font-black text-accent uppercase tracking-widest italic">
                                        <span>Out Time</span>
                                        <div className="w-2 h-2 rounded-full bg-accent"></div>
                                    </div>
                                    <p className="text-4xl font-black text-white font-mono tracking-tighter">
                                        {lastOut ? new Date(lastOut.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center py-4 relative">
                                <div className="absolute inset-x-0 h-px bg-white/5"></div>
                                {duration && (
                                    <div className="relative px-8 py-3 bg-black border border-white/10 rounded-lg shadow-2xl">
                                        <span className="text-base font-black text-primary font-mono tracking-widest">{duration}</span>
                                        <p className="text-[7px] text-gray-600 font-black uppercase text-center mt-1 tracking-widest">Hours Worked</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 italic">
                                <span>Verified Records: {selectedDayLogs.length}</span>
                                <span>Site: {userData?.siteId}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-20 glass-card bg-black/40 border-dashed border-white/5 rounded-lg text-center space-y-6 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                            <CalendarIcon className="w-10 h-10 text-white/5" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[12px] font-black text-gray-600 uppercase tracking-[0.4em]">No Logs</p>
                            <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest italic">No activity for this day</p>
                        </div>
                    </div>
                )}
            </section>


            {/* Leaves Registry */}
            {holidays.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Leave Records</h3>
                        <div className="h-[1px] flex-1 mx-6 bg-white/5"></div>
                        <span className="bg-sky-500/10 px-3 py-1 rounded-full text-[9px] font-black text-sky-500 uppercase">{holidays.length} Entries</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {holidays.map((h, i) => (
                            <div key={h.id} className="glass-card p-6 bg-black/40 border-white/5 rounded-lg hover:bg-white/[0.03] transition-all group flex items-center justify-between animate-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="flex items-center space-x-5">
                                    <div className="p-3.5 bg-sky-500/10 rounded-lg border border-sky-500/20 group-hover:scale-110 transition-transform">
                                        <Palmtree className="w-5 h-5 text-sky-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">{new Date(h.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-0.5 italic">{h.reason}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeHoliday(h.id)}
                                    className="p-3 bg-red-500/5 rounded-lg text-red-500/20 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95 hover:rotate-90"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}


            {/* Add Holiday Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="glass-card w-full max-w-md p-10 bg-black/60 rounded-lg border border-white/10 shadow-2xl relative">
                        <button
                            onClick={() => setShowHolidayModal(false)}
                            className="absolute top-8 right-8 p-3 bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all hover:rotate-90"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>

                        <div className="space-y-2 mb-10">
                            <h2 className="text-3xl font-black italic tracking-tight text-white italic text-center uppercase">Add <span className="text-sky-500 not-italic">Leave</span></h2>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] text-center">For {employee.name}</p>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Select Date</label>
                                <input
                                    type="date"
                                    value={holidayForm.date}
                                    onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })}
                                    className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-sky-500/50 text-base font-black text-white transition-all italic"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Authorized Reason</label>
                                <CustomDropdown
                                    value={holidayForm.reason}
                                    onChange={(val) => setHolidayForm({ ...holidayForm, reason: val })}
                                    options={leaveReasons}
                                    placeholder="Leave Type"
                                />
                            </div>

                            <button
                                onClick={addHoliday}
                                disabled={!holidayForm.date}
                                className="w-full bg-sky-500 py-6 rounded-lg font-black italic tracking-widest text-sm text-white disabled:opacity-20 shadow-[0_0_30px_rgba(14,165,233,0.3)] flex items-center justify-center space-x-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <span>Save Leave</span>
                                <Zap className="w-5 h-5 fill-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Calendar CSS - same as EmployeeCalendar */}
            <style>{`
                .react-calendar {
                    width: 100%;
                    background: transparent;
                    border: none;
                    font-family: inherit;
                    color: white;
                }
                .react-calendar__navigation {
                    margin-bottom: 2rem;
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
                    margin-bottom: 1.5rem;
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

export default EmployeeDetail;
