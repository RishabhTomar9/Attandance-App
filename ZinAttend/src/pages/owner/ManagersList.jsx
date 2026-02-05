import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { Users, Trash2, Ban, CheckCircle, Mail, Plus } from "lucide-react";

const ManagersList = () => {
    const { user } = useAuth();
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Invite State
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        fetchManagers();
    }, [user.siteId]);

    const fetchManagers = async () => {
        if (!user.siteId) return;
        try {
            const q = query(collection(db, "users"), where("siteId", "==", user.siteId), where("role", "==", "manager"));
            const snapshot = await getDocs(q);
            setManagers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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
            // Write to 'invites' collection with Email as ID
            await setDoc(doc(db, "invites", inviteEmail), {
                email: inviteEmail,
                siteId: user.siteId,
                role: "manager", // Hardcoded role for this page
                status: "pending",
                invitedBy: user.uid,
                createdAt: serverTimestamp()
            });
            alert(`Invitation sent to ${inviteEmail}. They can now login via Google.`);
            setInviteEmail("");
        } catch (err) {
            console.error(err);
            alert("Failed to send invite");
        }
        setInviting(false);
    };

    const toggleStatus = async (managerId, currentStatus) => {
        const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
        await updateDoc(doc(db, "users", managerId), { status: newStatus });
        fetchManagers(); // Refresh
    };

    const handleRemoveUser = async (managerId) => {
        if (!window.confirm("Remove this manager?")) return;
        await updateDoc(doc(db, "users", managerId), { siteId: null, role: null });
        fetchManagers();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Managers</h1>
                    <p className="text-slate-500">Oversee team leads and permissions</p>
                </div>
            </div>

            {/* Invite Card */}
            <Card title="Invite New Manager">
                <form onSubmit={handleInvite} className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700">Manager Email</label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="email"
                                required
                                placeholder="manager@company.com"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <button disabled={inviting} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2">
                        <Plus size={18} /> {inviting ? "Sending..." : "Invite"}
                    </button>
                </form>
                <p className="text-xs text-slate-500 mt-2">
                    Invited users can log in instantly with their Google account.
                </p>
            </Card>

            <Card className="overflow-hidden p-0">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4">Manager</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? <tr><td colSpan="4" className="p-4 text-center">Loading...</td></tr> : managers.map(mgr => (
                            <tr key={mgr.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-medium text-slate-800">{mgr.name}</td>
                                <td className="px-6 py-4 text-slate-600">{mgr.email}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleStatus(mgr.id, mgr.status)}
                                        className={`px-2 py-1 rounded text-xs font-bold uppercase ${mgr.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {mgr.status}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleRemoveUser(mgr.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default ManagersList;
