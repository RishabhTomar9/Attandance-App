import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { CheckCircle, Ban, Trash2, Mail, Plus, UserPlus } from "lucide-react";

const ManagerEmployees = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

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
            console.error("Error fetching employees:", error);
        }
        setLoading(false);
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setInviting(true);
        try {
            // Write to 'invites' collection
            // Managers invite EMPLOYEES
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
            console.error(err);
            alert("Failed to send invite: " + err.message);
        }
        setInviting(false);
    };

    const toggleStatus = async (empId, currentStatus) => {
        const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
        try {
            await updateDoc(doc(db, "users", empId), { status: newStatus });
            setEmployees(prev => prev.map(e => e.id === empId ? { ...e, status: newStatus } : e));
        } catch (e) {
            alert("Failed to update status");
        }
    };

    const handleRemove = async (empId) => {
        if (!window.confirm("Permanently remove this employee from the site?")) return;
        try {
            await updateDoc(doc(db, "users", empId), { siteId: null, role: null });
            setEmployees(prev => prev.filter(e => e.id !== empId));
        } catch (e) {
            alert("Failed to remove employee");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Team Management</h1>
                    <p className="text-slate-500">Manage your employees</p>
                </div>
            </div>

            {/* INVITE FORM */}
            <Card title="Add New Employee" className="bg-gradient-to-r from-white to-slate-50">
                <form onSubmit={handleInvite} className="flex gap-4 items-end max-w-2xl">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 block mb-1">Employee Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="email"
                                required
                                placeholder="john.doe@company.com"
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <button disabled={inviting} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors">
                        <UserPlus size={18} /> {inviting ? "Sending..." : "Send Invite"}
                    </button>
                </form>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <CheckCircle size={12} className="text-emerald-500" />
                    Invited users can login immediately via Google.
                </p>
            </Card>

            <Card className="overflow-hidden p-0 border-none shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Employee ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">Loading roster...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No employees found. Invite someone above!</td></tr>
                            ) : (
                                employees.map(emp => (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors bg-white">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                                                    {emp.name?.charAt(0).toUpperCase() || "U"}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{emp.name}</p>
                                                    <p className="text-xs text-slate-400">{emp.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                            {emp.employeeId || "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(emp.id, emp.status)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all hover:ring-2 hover:ring-slate-100 ring-offset-1 ${emp.status === 'inactive'
                                                        ? 'bg-rose-100 text-rose-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                    }`}
                                            >
                                                {emp.status === 'inactive' ? <Ban size={12} /> : <CheckCircle size={12} />}
                                                {emp.status === 'inactive' ? 'Suspend' : 'Active'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRemove(emp.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Remove from Site"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ManagerEmployees;
