import { useState, useEffect } from "react";
import { db, functions } from "../../services/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import { Download, Filter, Search, Edit2, Save, X } from "lucide-react";
import { httpsCallable } from "firebase/functions";

export default function AttendanceReports() {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0], // Today
        end: new Date().toISOString().split('T')[0]
    });
    const [statusFilter, setStatusFilter] = useState("all");

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        fetchReports();
    }, [dateRange, statusFilter]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Basic query constraints
            const constraints = [
                where("date", ">=", dateRange.start),
                where("date", "<=", dateRange.end)
            ];

            if (statusFilter !== "all") {
                constraints.push(where("status", "==", statusFilter));
            }

            // Note: Composite indexes required for range + equality on different fields.
            // If index missing, this might fail. For now, we rely on client side filtering if needed or assume index created.
            // Simplified: Fetch by date range, filter status in JS to avoid index hell for MVP.

            const q = query(collection(db, `attendance/${user.siteId}/records`), where("date", ">=", dateRange.start), where("date", "<=", dateRange.end));

            const snap = await getDocs(q);
            let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Client-side filter for status
            if (statusFilter !== "all") {
                data = data.filter(d => d.status === statusFilter);
            }

            // Enrich with user names? (Assume cache or fetch separately? For demo, we show UID or simple mapping if available)
            // Real app: Fetch users map.

            setRecords(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setEditForm({
            punchIn: record.punchIn ? new Date(record.punchIn.toDate()).toISOString().slice(0, 16) : "",
            punchOut: record.punchOut ? new Date(record.punchOut.toDate()).toISOString().slice(0, 16) : "",
            status: record.status
        });
    };

    const saveEdit = async () => {
        try {
            const updateFn = httpsCallable(functions, "updateAttendance");
            await updateFn({
                siteId: user.siteId,
                recordId: editingId,
                updates: editForm
            });
            setEditingId(null);
            fetchReports(); // Refresh
        } catch (err) {
            alert("Failed to update: " + err.message);
        }
    };

    const exportCSV = () => {
        const headers = ["User ID", "Date", "Punch In", "Punch Out", "Status"];
        const rows = records.map(r => [
            r.uid,
            r.date,
            r.punchIn ? new Date(r.punchIn.toDate()).toLocaleTimeString() : "-",
            r.punchOut ? new Date(r.punchOut.toDate()).toLocaleTimeString() : "-",
            r.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_report_${dateRange.start}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Attendance Reports</h1>
                <button onClick={exportCSV} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
                    <Download size={18} /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <Card className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-slate-500 uppercase">Date Range</label>
                    <div className="flex gap-2 mt-1">
                        <input
                            type="date"
                            className="border p-2 rounded-lg w-full"
                            value={dateRange.start}
                            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className="self-center text-slate-400">to</span>
                        <input
                            type="date"
                            className="border p-2 rounded-lg w-full"
                            value={dateRange.end}
                            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="w-full md:w-48">
                    <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <select
                        className="border p-2 rounded-lg w-full mt-1 bg-white"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half-day">Half Day</option>
                    </select>
                </div>
                <button onClick={fetchReports} className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700">
                    <Search size={20} />
                </button>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Employee (UID)</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">In</th>
                                <th className="px-6 py-4 font-medium">Out</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-slate-400">No records found for this period.</td>
                                </tr>
                            ) : (
                                records.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50/50">
                                        {editingId === r.id ? (
                                            <>
                                                <td className="px-6 py-4 text-slate-500">{r.uid.substring(0, 8)}...</td>
                                                <td className="px-6 py-4 text-slate-500">{r.date}</td>
                                                <td className="px-6 py-4">
                                                    <input type="datetime-local" className="border rounded p-1 text-xs"
                                                        value={editForm.punchIn} onChange={e => setEditForm({ ...editForm, punchIn: e.target.value })} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input type="datetime-local" className="border rounded p-1 text-xs"
                                                        value={editForm.punchOut} onChange={e => setEditForm({ ...editForm, punchOut: e.target.value })} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select className="border rounded p-1 text-xs" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                                        <option value="present">Present</option>
                                                        <option value="half-day">Half-Day</option>
                                                        <option value="absent">Absent</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button onClick={saveEdit} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Save size={16} /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-rose-600 hover:bg-rose-50 p-1 rounded"><X size={16} /></button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 font-medium text-slate-700">{r.uid.substring(0, 8)}...</td>
                                                <td className="px-6 py-4 text-slate-500">{r.date}</td>
                                                <td className="px-6 py-4">{r.punchIn ? new Date(r.punchIn.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="px-6 py-4">{r.punchOut ? new Date(r.punchOut.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${r.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                                                            r.status === 'half-day' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {(user.role === 'owner' || user.role === 'manager') && (
                                                        <button onClick={() => handleEdit(r)} className="text-slate-400 hover:text-blue-600 p-1">
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
