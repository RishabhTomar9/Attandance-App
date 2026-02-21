import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { UserPlus, Search, Trash2, Edit2, Mail, Hash, Users, Activity, Zap, ShieldCheck, X, Eye } from 'lucide-react';
import Loader from '../../components/UI/Loader';

const EmployeeManagement = () => {
    const { userData } = useAuth();
    const { showToast, confirm } = useUI();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingEmployee, setEditingEmployee] = useState(null);

    useEffect(() => {
        fetchEmployees();
    }, [userData]);

    const fetchEmployees = async () => {
        if (!userData?.siteId) return;
        try {
            const q = query(collection(db, 'users'), where('siteId', '==', userData.siteId), where('role', '==', 'employee'));
            const snapshot = await getDocs(q);
            setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!newEmail || !newName) return;
        setIsSubmitting(true);
        try {
            const q = query(collection(db, 'users'), where('email', '==', newEmail));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                showToast('Personnel profile already exists', 'error');
                setIsSubmitting(false);
                return;
            }

            const employeeId = `EMP${Math.floor(1000 + Math.random() * 9000)}`;

            await addDoc(collection(db, 'users'), {
                email: newEmail,
                name: newName,
                role: 'employee',
                siteId: userData.siteId,
                employeeId: employeeId,
                isLinked: false,
                createdAt: serverTimestamp(),
            });

            setNewEmail('');
            setNewName('');
            setShowAddModal(false);
            fetchEmployees();
        } catch (err) {
            console.error(err);
            alert('Failed to deploy personnel node');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditEmployee = async (e) => {
        e.preventDefault();
        if (!editingEmployee.name || !editingEmployee.email) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'users', editingEmployee.id), {
                name: editingEmployee.name,
                email: editingEmployee.email,
                updatedAt: serverTimestamp(),
            });
            showToast('Personnel node reconfigured', 'success');
            setEditingEmployee(null);
            fetchEmployees();
        } catch (err) {
            console.error(err);
            showToast('Node reconfig failure', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        const confirmed = await confirm({
            title: 'Decommission Staff Member',
            message: `Are you sure you want to remove ${name} from the active personnel registry? Their access credentials will be revoked.`,
            danger: true,
            confirmText: 'DECOMMISSION',
            cancelText: 'ABORT'
        });

        if (!confirmed) return;
        try {
            await deleteDoc(doc(db, 'users', id));
            showToast('Staff node decommissioned', 'success');
            fetchEmployees();
        } catch (err) {
            console.error(err);
            showToast('Decommission failure', 'error');
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
            <header className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="inline-flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                        <Users className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Personnel Registry</span>
                    </div>
                    <h1 className="text-4xl font-black italic ">Staff <span className="text-primary italic">Nodes</span></h1>
                    <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">{employees.length} Registered • {employees.filter(e => e.isLinked).length} Active</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="premium-btn px-6 py-3 rounded-xl flex items-center space-x-2 text-[10px] font-black tracking-widest uppercase text-white shadow-neon"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Deploy</span>
                </button>
            </header>

            <div className="relative group">
                <div className="absolute inset-0 bg-primary/5 blur-xl group-focus-within:bg-primary/10 transition-all rounded-xl"></div>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 z-10" />
                <input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    className="w-full bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl p-5 pl-12 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold text-white relative z-10 placeholder:text-gray-700"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="space-y-4">
                {loading ? (
                    <Loader message="Scanning_Registry" />
                ) : filteredEmployees.length > 0 ? (
                    filteredEmployees.map(emp => (
                        <div key={emp.id} className="glass-card p-6 border-white/10 bg-gradient-to-r from-slate-900/40 to-black/40 relative group overflow-hidden rounded-xl">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>

                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center font-black text-2xl text-primary overflow-hidden border border-white/10 p-0.5">
                                            {emp.photoURL ? <img src={emp.photoURL} alt="pfp" className="w-full h-full object-cover rounded-lg" /> : emp.name?.[0] || 'E'}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg border-4 border-black flex items-center justify-center ${emp.isLinked ? 'bg-secondary' : 'bg-yellow-500'}`}>
                                            <Zap className="w-2 h-2 text-black" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black italic  text-white uppercase">{emp.name}</h3>
                                        <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                            <Mail className="w-3 h-3 mr-1.5 text-primary" />
                                            <span className="truncate max-w-[150px]">{emp.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <Link
                                        to={`/owner/employees/${emp.id}`}
                                        className="p-3 bg-primary/10 rounded-xl text-primary hover:text-white hover:bg-primary transition-all border border-primary/20 active:scale-95"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => setEditingEmployee(emp)}
                                        className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 active:scale-95"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(emp.id, emp.name)}
                                        className="p-3 bg-red-500/10 rounded-xl text-red-500 hover:text-white hover:bg-red-500 transition-all border border-red-500/20 active:scale-95"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2 px-3 py-1 bg-black/60 rounded-lg border border-white/5 font-mono text-[10px] font-black italic text-primary/80">
                                        <Hash className="w-3 h-3" />
                                        <span>ID: {emp.employeeId}</span>
                                    </div>
                                </div>
                                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${emp.isLinked ? 'bg-secondary/10 border-secondary/20 text-secondary' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'} font-black text-[8px] uppercase tracking-widest`}>
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>{emp.isLinked ? 'UPLINK ACTIVE' : 'AWAITING SYNC'}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 glass-card bg-white/2 border-dashed border-white/10 rounded-xl">
                        <Users className="w-16 h-16 text-gray-800 mb-6" />
                        <p className="text-gray-600 font-black italic tracking-tight uppercase">No staff nodes found</p>
                        <p className="text-gray-700 text-[9px] font-medium mt-1">{searchQuery ? 'Try a different search query' : 'Deploy new staff to get started'}</p>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-md p-10 space-y-8 bg-black/60 ring-1 ring-white/10 shadow-neon-soft relative border-white/10">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-6 right-6 p-2 bg-white/5 rounded-lg text-gray-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black italic  text-white uppercase italic">Personnel <span className="text-primary italic">Initialization</span></h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Deploying new node to site: {userData?.siteId}</p>
                        </div>

                        <form onSubmit={handleAddEmployee} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Staff Legal Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 focus:outline-none focus:border-primary/50 text-sm font-bold text-white transition-all placeholder:text-gray-800 italic"
                                    placeholder="Enter full name..."
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Google Uplink Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 focus:outline-none focus:border-primary/50 text-sm font-bold text-white transition-all placeholder:text-gray-800 italic"
                                    placeholder="Enter authorized email..."
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 bg-white/5 py-5 rounded-lg font-black uppercase tracking-widest text-[10px] text-gray-500 hover:bg-white/10 transition-all border border-white/5"
                                >
                                    ABORT
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 premium-btn py-5 rounded-lg font-black italic tracking-widest text-[10px] text-white disabled:opacity-20 shadow-neon"
                                >
                                    {isSubmitting ? 'INITIALIZING...' : 'DEPLOY NODE'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingEmployee && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-md p-10 space-y-8 bg-black/60 ring-1 ring-white/10 shadow-neon-soft relative border-white/10">
                        <button
                            onClick={() => setEditingEmployee(null)}
                            className="absolute top-6 right-6 p-2 bg-white/5 rounded-lg text-gray-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black italic  text-white uppercase italic">Node <span className="text-primary italic">Reconfig</span></h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Updating personnel parameters for ID: {editingEmployee.employeeId}</p>
                        </div>

                        <form onSubmit={handleEditEmployee} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Staff Legal Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 focus:outline-none focus:border-primary/50 text-sm font-bold text-white transition-all placeholder:text-gray-800 italic"
                                    value={editingEmployee.name}
                                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Google Uplink Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 focus:outline-none focus:border-primary/50 text-sm font-bold text-white transition-all placeholder:text-gray-800 italic"
                                    value={editingEmployee.email}
                                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingEmployee(null)}
                                    className="flex-1 bg-white/5 py-5 rounded-lg font-black uppercase tracking-widest text-[10px] text-gray-500 hover:bg-white/10 transition-all border border-white/5"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 premium-btn py-5 rounded-lg font-black italic tracking-widest text-[10px] text-white disabled:opacity-20 shadow-neon"
                                >
                                    {isSubmitting ? 'SYNCING...' : 'SAVE CHANGES'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;

