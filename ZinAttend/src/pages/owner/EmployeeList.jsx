import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { Users, UserPlus, Copy, Check, Trash2, Ban, CheckCircle, Edit2, Save, X } from "lucide-react";

// Updated EmployeeList to include Employee ID management and Status Toggling
const EmployeeList = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Employee ID Editing State
    const [editingId, setEditingId] = useState(null);
    const [tempEmpId, setTempEmpId] = useState("");

    // Invite Modal State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteRole, setInviteRole] = useState("employee");
    const [generatedLink, setGeneratedLink] = useState("");
    const [copySuccess, setCopySuccess] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, [user.siteId]);

    const fetchEmployees = async () => {
        if (!user.siteId) return;
        try {
            // Only fetch role='employee' to keep this list focused
            const q = query(
                collection(db, "users"),
                where("siteId", "==", user.siteId),
                where("role", "==", "employee")
            );
            const snapshot = await getDocs(q);
            const employeeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEmployees(employeeData);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
        setLoading(false);
    };

    // ... Invite Logic (Same as before) ...
    const handleGenerateInvite = async () => {
        setGenerating(true);
        try {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            await addDoc(collection(db, "invites"), {
                code: code,
                role: inviteRole,
                siteId: user.siteId,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                status: "active",
                orgName: "ZinAttend Org"
            });
            const link = `${window.location.origin}/join?code=${code}`;
            setGeneratedLink(link);
            setCopySuccess(false);
        } catch (error) {
            console.error("Error creating invite:", error);
        }
        setGenerating(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopySuccess(true);
    };

    const handleRemoveUser = async (employeeId) => {
        if (!window.confirm("Are you sure you want to remove this user from the organization?")) return;
        try {
            const userRef = doc(db, "users", employeeId);
            await updateDoc(userRef, { siteId: null, role: null });
            setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        } catch (err) {
            console.error("Failed to remove user", err);
            alert("Error removing user.");
        }
    };

    // NEW: Status Toggling
    const toggleStatus = async (empId, currentStatus) => {
        const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
        try {
            const userRef = doc(db, "users", empId);
            await updateDoc(userRef, { status: newStatus });
            setEmployees(prev => prev.map(e => e.id === empId ? { ...e, status: newStatus } : e));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    // NEW: Edit Employee ID
    const startEdit = (emp) => {
        setEditingId(emp.id);
        setTempEmpId(emp.employeeId || "");
    };

    const saveEmployeeId = async (empId) => {
        try {
            // Check uniqueness locally roughly, or assume firestore rules/fail handles it.
            // Ideally check uniqueness against DB
            const userRef = doc(db, "users", empId);
            await updateDoc(userRef, { employeeId: tempEmpId });
            setEmployees(prev => prev.map(e => e.id === empId ? { ...e, employeeId: tempEmpId } : e));
            setEditingId(null);
        } catch (error) {
            console.error("Error saving ID:", error);
            alert("Failed to save Employee ID");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
                    <p className="text-slate-500">Manage your workforce roster</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    <UserPlus size={18} /> Invite New
                </button>
            </div>

            <Card className="overflow-hidden p-0">
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
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No employees yet.</td></tr>
                            ) : (
                                employees.map(emp => (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                                                    {emp.name?.charAt(0) || "U"}
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
                                                    <input
                                                        type="text"
                                                        value={tempEmpId}
                                                        onChange={(e) => setTempEmpId(e.target.value)}
                                                        className="w-24 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                    <button onClick={() => saveEmployeeId(emp.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={14} /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/edit">
                                                    <span>{emp.employeeId || "—"}</span>
                                                    <button onClick={() => startEdit(emp)} className="opacity-0 group-hover/edit:opacity-100 text-blue-400 hover:text-blue-600 transition-opacity">
                                                        <Edit2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(emp.id, emp.status)}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${emp.status === 'inactive'
                                                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                    }`}>
                                                {emp.status === 'inactive' ? <Ban size={12} /> : <CheckCircle size={12} />}
                                                {emp.status === 'inactive' ? 'Inactive' : 'Active'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRemoveUser(emp.id)}
                                                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Remove User">
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

            {/* Reuse Invite Modal code... */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-5 animate-in fade-in zoom-in duration-200">
                        {/* ... Same modal content ... */}
                        {!generatedLink ? (
                            <>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-slate-800">Invite New Member</h3>
                                    <p className="text-sm text-slate-500">Generate a unique link to join your team.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setInviteRole('employee')} className={`py-2 border rounded-lg ${inviteRole === 'employee' ? 'bg-blue-50 border-blue-500 text-blue-700' : ''}`}>Employee</button>
                                    <button onClick={() => setInviteRole('manager')} className={`py-2 border rounded-lg ${inviteRole === 'manager' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : ''}`}>Manager</button>
                                </div>
                                <button onClick={handleGenerateInvite} disabled={generating} className="w-full py-2 bg-slate-900 text-white rounded-lg">{generating ? 'Generating...' : 'Generate Link'}</button>
                            </>
                        ) : (
                            <>
                                <div className="p-3 bg-slate-50 border rounded flex items-center justify-between">
                                    <span className="text-xs font-mono">{generatedLink}</span>
                                    <button onClick={copyToClipboard}><Copy size={16} /></button>
                                </div>
                                <button onClick={() => { setShowInviteModal(false); setGeneratedLink('') }} className="w-full py-2 bg-slate-100 rounded-lg">Done</button>
                            </>
                        )}
                        <button onClick={() => setShowInviteModal(false)} className="absolute top-2 right-2 p-2"><X size={20} className="text-slate-400" /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeList;
