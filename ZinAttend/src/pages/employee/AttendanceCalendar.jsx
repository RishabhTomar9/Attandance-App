import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Card from '../../components/ui/Card';
import { Loader2, Clock, CheckCircle } from 'lucide-react';
// css handled by style tag below

export default function AttendanceCalendar() {
    const { user } = useAuth();
    const [date, setDate] = useState(new Date());
    const [history, setHistory] = useState({}); // { "2023-10-01": { status: 'present', ... } }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [user.uid]);

    const fetchHistory = async () => {
        // Fetch all records for user. Optimization: Fetch by month range.
        // For MVP, fetch all.
        try {
            const q = query(
                collection(db, `attendance/${user.siteId}/records`),
                where("uid", "==", user.uid)
            );
            const snap = await getDocs(q);
            const map = {};
            snap.forEach(doc => {
                const data = doc.data();
                map[data.date] = data; // Key by YYYY-MM-DD
            });
            setHistory(map);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const tileClassName = ({ date, view }) => {
        if (view !== 'month') return null;

        // Convert JS Date to YYYY-MM-DD (local time safety)
        const dateStr = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
        const record = history[dateStr];

        if (!record) return null;

        if (record.status === 'present') return 'cal-present';
        if (record.status === 'half-day') return 'cal-half';
        if (record.status === 'absent') return 'cal-absent';
        return null;
    };

    // Derived details for selected date
    const selectedDateStr = date.toLocaleDateString("en-CA");
    const selectedRecord = history[selectedDateStr];

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <Card title="Attendance Calendar" className="h-full">
                    {loading ? (
                        <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : (
                        <div className="custom-calendar-wrapper">
                            <Calendar
                                onChange={setDate}
                                value={date}
                                tileClassName={tileClassName}
                            />
                        </div>
                    )}
                </Card>
            </div>

            <div>
                <Card title="Day Details" className="h-full">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-slate-800">{date.getDate()}</h2>
                        <p className="text-slate-500 uppercase text-sm font-semibold">{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>

                    {selectedRecord ? (
                        <div className="space-y-4">
                            <div className={`p-3 rounded-lg text-center font-bold uppercase ${selectedRecord.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                                selectedRecord.status === 'half-day' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                {selectedRecord.status}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                                    <span className="text-slate-500 flex items-center gap-2"><Clock size={16} /> Punch In</span>
                                    <span className="font-mono font-medium">
                                        {selectedRecord.punchIn ? new Date(selectedRecord.punchIn.toDate()).toLocaleTimeString([], { timeStyle: 'short' }) : '--:--'}
                                    </span>
                                </div>
                                <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                                    <span className="text-slate-500 flex items-center gap-2"><Clock size={16} /> Punch Out</span>
                                    <span className="font-mono font-medium">
                                        {selectedRecord.punchOut ? new Date(selectedRecord.punchOut.toDate()).toLocaleTimeString([], { timeStyle: 'short' }) : '--:--'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 py-8">
                            <Clock size={48} className="mx-auto mb-2 opacity-20" />
                            <p>No record for this date.</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Style Injection for Calendar Colors */}
            <style>{`
                .react-calendar { border: none; width: 100%; font-family: inherit; }
                .react-calendar__tile { padding: 1em 0.5em; height: 80px; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; }
                .react-calendar__tile--now { background: #f8fafc; color: #3b82f6; }
                .react-calendar__tile--active { background: #eff6ff !important; color: #1e40af !important; border: 2px solid #3b82f6; border-radius: 8px; }
                
                /* Status Indicators */
                .cal-present abbr { position: relative; }
                .cal-present::after { content: ''; width: 6px; height: 6px; background: #10b981; border-radius: 50%; margin-top: 4px; }
                
                .cal-half::after { content: ''; width: 6px; height: 6px; background: #f59e0b; border-radius: 50%; margin-top: 4px; }
                
                .cal-absent::after { content: ''; width: 6px; height: 6px; background: #f43f5e; border-radius: 50%; margin-top: 4px; }
             `}</style>
        </div>
    );
}
