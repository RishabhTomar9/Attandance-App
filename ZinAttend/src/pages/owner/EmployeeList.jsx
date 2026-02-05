import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { UserPlus, Trash2, Ban, CheckCircle, Edit2, Save, X, Mail } from "lucide-react";

// Owner's View of Employees
const EmployeeList = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Edit State
    const [editingId, setEditingId] = useState(null);
    const [tempEmpId, setTempEmpId] = useState("");

    // Invite State
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, [user.siteId]);

    const fetchEmployees = async () => {
        if (!user.siteId) return;
        try {
            const q = query(
                collection(db, "users"),
                where("siteId", "==", user.siteId),
                where("role", "==", "employee")
            );
            const snapshot = await getDocs(q);
            setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setInviting(true);
        try {
            await setDoc(doc(db, "invites", inviteEmail), {
                email: inviteEmail,
                siteId: user.siteId,
                role: "employee",
                status: "pending",
                invitedBy: user.uid,
                createdAt: serverTimestamp()
            });
            alert(`Invitation sent to ${inviteEmail}.`);
            setInviteEmail("");
        } catch (err) {
            alert("Invite failed: " + err.message);
        }
        setInviting(false);
    };

    const toggleStatus = async (empId, currentStatus) => {
        const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
        await updateDoc(doc(db, "users", empId), { status: newStatus });
        setEmployees(prev => prev.map(e => e.id === empId ? { ...e, status: newStatus } : e));
    };

    const handleRemoveUser = async (empId) => {
        if (!window.confirm("Remove this user permanently?")) return;
        await updateDoc(doc(db, "users", empId), { siteId: null, role: null });
        setEmployees(prev => prev.filter(e => e.id !== empId));
    };

    const startEdit = (emp) => {
        setEditingId(emp.id);
        setTempEmpId(emp.employeeId || "");
    };

    const saveEmployeeId = async (empId) => {
        await updateDoc(doc(db, "users", empId), { employeeId: tempEmpId });
        setEmployees(prev => prev.map(e => e.id === empId ? { ...e, employeeId: tempEmpId } : e));
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">All Employees</h1>
                    <p className="text-slate-500">Full roster control</p>
                </div>
            </div>

            {/* Invite Form */}
            <Card title="Add New Employee">
                <form onSubmit={handleInvite} className="flex gap-3 items-end max-w-xl">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="email"
                                required
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="employee@company.com"
                            />
                        </div>
                    </div>
                    <button disabled={inviting} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2">
                        <UserPlus size={18} /> {inviting ? "Sending..." : "Invite"}
                    </button>
                </form>
            </Card>

            <Card className="overflow-hidden p-0">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Employee ID</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? <tr><td colSpan="4" className="p-8 text-center">Loading...</td></tr> : employees.map(emp => (
                            <tr key={emp.id} className="hover:bg-slate-50/50 group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                            {emp.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{emp.name}</p>
                                            <p className="text-xs text-slate-400">{emp.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                    {editingId === emp.id ? (
                                        <div className="flex items-center gap-2">
                                            <input value={tempEmpId} onChange={e => setTempEmpId(e.target.value)} className="w-20 border px-1 py-0.5 rounded" />
                                            <button onClick={() => saveEmployeeId(emp.id)} className="text-emerald-600"><Save size={14} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group/edit">
                                            <span>{emp.employeeId || "—"}</span>
                                            <button onClick={() => startEdit(emp)} className="opacity-0 group-hover/edit:opacity-100 text-blue-400"><Edit2 size={12} /></button>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleStatus(emp.id, emp.status)}
                                        className={`px-2 py-1 rounded text-xs font-bold uppercase ${emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {emp.status}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleRemoveUser(emp.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default EmployeeList;
