import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { Users, Trash2, Ban, CheckCircle } from "lucide-react";

const ManagersList = () => {
    const { user } = useAuth();
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchManagers();
    }, [user.siteId]);

    const fetchManagers = async () => {
        if (!user.siteId) return;
        try {
            const q = query(
                collection(db, "users"),
                where("siteId", "==", user.siteId),
                where("role", "==", "manager")
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setManagers(data);
        } catch (error) {
            console.error("Error fetching managers:", error);
        }
        setLoading(false);
    };

    const toggleStatus = async (managerId, currentStatus) => {
        const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
        try {
            const userRef = doc(db, "users", managerId);
            await updateDoc(userRef, { status: newStatus });
            // Update local state
            setManagers(prev => prev.map(m => m.id === managerId ? { ...m, status: newStatus } : m));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const handleRemoveUser = async (managerId) => {
        if (!window.confirm("Remove this manager? They will lose access to the organization.")) return;
        try {
            const userRef = doc(db, "users", managerId);
            await updateDoc(userRef, { siteId: null, role: null });
            setManagers(prev => prev.filter(m => m.id !== managerId));
        } catch (err) {
            console.error("Failed to remove user", err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Managers</h1>
                    <p className="text-slate-500">Oversee team leads and permissions</p>
                </div>
                {/* Note: Invites are handled centrally via the Invite Button on Employees/Team Page or here potentially. 
                    For now, focusing on management of existing. */}
            </div>

            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Manager</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">Loading managers...</td></tr>
                            ) : managers.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No managers found. Invite some from the Team page!</td></tr>
                            ) : (
                                managers.map(mgr => (
                                    <tr key={mgr.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                                    {mgr.name?.charAt(0) || "M"}
                                                </div>
                                                <span className="font-medium text-slate-800">{mgr.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{mgr.email}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(mgr.id, mgr.status)}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${mgr.status === 'inactive'
                                                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                    }`}>
                                                {mgr.status === 'inactive' ? <Ban size={12} /> : <CheckCircle size={12} />}
                                                {mgr.status === 'inactive' ? 'Inactive' : 'Active'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRemoveUser(mgr.id)}
                                                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Remove Manager">
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

export default ManagersList;
