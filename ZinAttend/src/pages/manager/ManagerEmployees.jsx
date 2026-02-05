import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { CheckCircle, Ban } from "lucide-react";

// Read-Only version for Managers
const ManagerEmployees = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        fetchEmployees();
    }, [user.siteId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
                    <p className="text-slate-500">View team roster</p>
                </div>
            </div>

            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Employee ID</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-500">No employees found.</td></tr>
                            ) : (
                                employees.map(emp => (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
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
                                            {emp.employeeId || "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${emp.status === 'inactive'
                                                    ? 'bg-rose-100 text-rose-700'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {emp.status === 'inactive' ? <Ban size={12} /> : <CheckCircle size={12} />}
                                                {emp.status === 'inactive' ? 'Inactive' : 'Active'}
                                            </span>
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
