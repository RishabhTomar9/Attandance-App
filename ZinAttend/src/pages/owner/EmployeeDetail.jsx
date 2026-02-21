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
            const hasIn = logs.some(l => l.type === 'IN');
            const hasOut = logs.some(l => l.type === 'OUT');
            if (hasIn && hasOut) return 'tile-present';
            if (hasIn) return 'tile-half';
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
        const hasIn = dayLogs.some(l => l.type === 'IN');
        const hasOut = dayLogs.some(l => l.type === 'OUT');

        if (hasIn && hasOut) presentCount++;
        else if (hasIn) halfDayCount++;
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Back */}
            <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group">
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Back to Staff</span>
            </button>

            {/* Profile Header */}
            <div className="glass-card p-6 rounded-xl border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <User className="w-28 h-28" />
                </div>
                <div className="relative z-10 flex items-center space-x-5">
                    <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center font-black text-2xl text-primary overflow-hidden border border-white/10 p-0.5">
                        {employee.photoURL ? <img src={employee.photoURL} alt="" className="w-full h-full object-cover rounded-xl" /> : employee.name?.[0]}
                    </div>
                    <div className="flex-1 space-y-1">
                        <h1 className="text-2xl font-black tracking-tight uppercase italic">{employee.name}</h1>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{employee.email}</p>
                        <div className="flex items-center space-x-3 mt-2">
                            <span className="text-[8px] font-black px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">{employee.employeeId}</span>
                            <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${employee.isLinked ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                {employee.isLinked ? 'Linked' : 'Pending'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Present', value: presentCount, color: 'emerald-500', icon: CheckCircle },
                    { label: 'Absent', value: absentCount, color: 'red-500', icon: XCircle },
                    { label: 'Half Day', value: halfDayCount, color: 'amber-500', icon: AlertTriangle },
                    { label: 'Leaves', value: monthHolidayDates.length, color: 'blue-500', icon: Palmtree }
                ].map((s, i) => (
                    <div key={i} className="glass-card p-4 rounded-xl border-white/5 text-center space-y-2">
                        <s.icon className={`w-4 h-4 text-${s.color} mx-auto`} />
                        <p className="text-2xl font-black ">{s.value}</p>
                        <p className={`text-[7px] font-black uppercase tracking-widest text-${s.color}`}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Calendar + Add Holiday */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Attendance Calendar</h3>
                </div>
                <button onClick={() => setShowHolidayModal(true)} className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 transition-all active:scale-95">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Add Leave</span>
                </button>
            </div>

            {/* Calendar View */}
            <div className="glass-card p-6 calendar-container bg-black/40 backdrop-blur-2xl border-white/5 ring-1 ring-white/10 shadow-neon-soft rounded-xl">
                <Calendar
                    onChange={handleDateSelect}
                    value={selectedDate}
                    onActiveStartDateChange={({ activeStartDate }) => setCalendarDate(activeStartDate)}
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
                {joiningDate && (
                    <p className="text-center text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-3">Joined {joiningDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                )}
            </div>

            {/* Selected Day Summary */}
            <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="font-black italic text-lg flex items-center tracking-tight">
                        <Clock className="w-4 h-4 mr-3 text-primary" />
                        Day Detail
                    </h3>
                    <div className="bg-white/5 px-4 py-1.5 rounded-xl border border-white/10">
                        <span className="text-[10px] font-black font-mono text-gray-400">
                            {selectedDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                        </span>
                    </div>
                </div>

                {selectedIsHoliday ? (
                    <div className="glass-card p-6 rounded-xl border-blue-500/20 bg-blue-500/5">
                        <div className="flex items-center space-x-4">
                            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                <Palmtree className="text-blue-500 w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-black text-sm uppercase tracking-wider text-blue-500">Leave Day</p>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{selectedHolidayInfo?.reason || 'Holiday'}</p>
                            </div>
                        </div>
                    </div>
                ) : selectedDayLogs.length > 0 ? (
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
                                            {firstIn ? new Date(firstIn.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
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
                                {duration && (
                                    <div className="mx-4 px-4 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">{duration} Total</span>
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
                                            {lastOut ? new Date(lastOut.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
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
                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{employee.name}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 glass-card bg-white/2 border-dashed border-white/10 rounded-xl">
                        <CalendarIcon className="w-10 h-10 text-gray-800 mb-3" />
                        <p className="text-gray-600 font-bold italic tracking-tight text-sm">No activity on this day</p>
                    </div>
                )}
            </section>

            {/* Holidays List */}
            {holidays.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center space-x-2 px-1">
                        <Palmtree className="w-4 h-4 text-blue-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Recorded Leaves ({holidays.length})</h3>
                    </div>
                    <div className="space-y-2">
                        {holidays.map(h => (
                            <div key={h.id} className="glass-card p-4 rounded-xl border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <CalendarIcon className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{new Date(h.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{h.reason}</p>
                                    </div>
                                </div>
                                <button onClick={() => removeHoliday(h.id)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Add Holiday Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 pb-20 sm:pb-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setShowHolidayModal(false)}></div>
                    <div className="glass-card w-full max-w-md p-8 space-y-6 bg-black/60 ring-1 ring-white/10 shadow-2xl rounded-xl relative z-10 border-white/10 animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowHolidayModal(false)} className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                            <XCircle className="w-4 h-4 text-gray-400" />
                        </button>

                        <div className="space-y-1 text-center">
                            <h2 className="text-xl font-black italic tracking-tight uppercase">Record <span className="text-blue-500">Leave</span></h2>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">For {employee.name}</p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Date</label>
                                <input type="date" value={holidayForm.date} onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Reason</label>
                                <CustomDropdown
                                    value={holidayForm.reason}
                                    onChange={(val) => setHolidayForm({ ...holidayForm, reason: val })}
                                    options={leaveReasons}
                                    placeholder="Select leave reason..."
                                />
                            </div>
                        </div>

                        <button onClick={addHoliday} disabled={!holidayForm.date}
                            className="w-full premium-btn py-4 rounded-xl font-black text-[10px] tracking-widest uppercase text-white disabled:opacity-30 shadow-neon">
                            Record Leave
                        </button>
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
