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
                showToast('User already exists', 'error');
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
            alert('Failed to add staff');
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
            showToast('Staff member updated', 'success');
            setEditingEmployee(null);
            fetchEmployees();
        } catch (err) {
            console.error(err);
            showToast('Update failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        const confirmed = await confirm({
            title: 'Remove Staff Member',
            message: `Are you sure you want to remove ${name}? This action cannot be undone.`,
            danger: true,
            confirmText: 'REMOVE',
            cancelText: 'CANCEL'
        });

        if (!confirmed) return;
        try {
            await deleteDoc(doc(db, 'users', id));
            showToast('Staff removed', 'success');
            fetchEmployees();
        } catch (err) {
            console.error(err);
            showToast('Removal failed', 'error');
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
            <header className="space-y-4 px-1">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Staff</p>
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tight">My <span className="text-white/40 not-italic">Team</span></h1>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-primary p-4 rounded-lg text-white shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:scale-105 active:scale-95 transition-all"
                    >
                        <UserPlus className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex items-center space-x-3 text-gray-600">
                    <Activity className="w-3.5 h-3.5" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">{employees.length} Team Members</p>
                </div>
            </header>


            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-20 group-focus-within:opacity-100 transition duration-700"></div>
                <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search team member..."
                        className="w-full bg-black/60 backdrop-blur-3xl border border-white/5 rounded-lg p-6 pl-14 focus:outline-none focus:border-primary/50 transition-all text-sm font-bold text-white placeholder:text-gray-700"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>


            <div className="space-y-4">
                {loading ? (
                    <Loader message="Loading Team..." />
                ) : filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp, i) => (
                        <div key={emp.id} className="glass-card p-6 bg-black/40 border-white/5 rounded-lg hover:bg-white/[0.03] transition-all group animate-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 50}ms` }}>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center space-x-5 min-w-0">
                                    <div className="relative shrink-0">
                                        <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-2xl text-primary overflow-hidden shadow-2xl group-hover:scale-105 transition-transform">
                                            {emp.photoURL ? <img src={emp.photoURL} alt="pfp" className="w-full h-full object-cover" /> : emp.name?.[0] || 'E'}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-[3px] border-black shadow-lg ${emp.isLinked ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                            <ShieldCheck className="w-2.5 h-2.5 text-black mx-auto mt-0.5" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <h3 className="text-xl font-black tracking-tight text-white truncate">{emp.name}</h3>
                                        <div className="flex items-center text-[10px] text-gray-600 font-bold uppercase tracking-widest truncate">
                                            <span className="truncate">{emp.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2 shrink-0">
                                    <Link
                                        to={`/owner/employees/${emp.id}`}
                                        className="p-3 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-primary/20 transition-all border border-white/5 active:scale-95"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => setEditingEmployee(emp)}
                                        className="p-3 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 active:scale-95"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 font-mono text-[9px] font-black text-gray-500 uppercase tracking-widest italic">
                                        ID: {emp.employeeId}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(emp.id, emp.name)}
                                    className="p-2.5 bg-red-500/5 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 active:scale-95 flex items-center space-x-2"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Remove</span>
                                </button>
                            </div>
                        </div>
                    ))

                ) : (
                    <div className="flex flex-col items-center justify-center py-20 glass-card bg-white/2 border-dashed border-white/10 rounded-lg">
                        <Users className="w-16 h-16 text-gray-800 mb-6" />
                        <p className="text-gray-600 font-black italic tracking-tight uppercase">No team members found</p>
                        <p className="text-gray-700 text-[9px] font-medium mt-1">{searchQuery ? 'Try a different search query' : 'Add team members to get started'}</p>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="glass-card w-full max-w-md p-10 bg-black/60 rounded-lg border border-white/10 shadow-2xl relative">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-8 right-8 p-3 bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all hover:rotate-90"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-2 mb-10">
                            <h2 className="text-3xl font-black italic tracking-tight text-white">Add <span className="text-primary not-italic">Member</span></h2>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">Add a new member to your team</p>
                        </div>

                        <form onSubmit={handleAddEmployee} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-primary/50 text-base font-bold text-white transition-all placeholder:text-gray-800 italic"
                                    placeholder="e.g. John Doe"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-primary/50 text-base font-bold text-white transition-all placeholder:text-gray-800 italic"
                                    placeholder="e.g. john@company.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-primary py-6 rounded-lg font-black italic tracking-widest text-sm text-white disabled:opacity-20 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center space-x-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isSubmitting ? 'Adding...' : (
                                    <>
                                        <span>Add Team Member</span>
                                        <Zap className="w-5 h-5 fill-white" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}


            {editingEmployee && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="glass-card w-full max-w-md p-10 bg-black/60 rounded-lg border border-white/10 shadow-2xl relative">
                        <button
                            onClick={() => setEditingEmployee(null)}
                            className="absolute top-8 right-8 p-3 bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all hover:rotate-90"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-2 mb-10">
                            <h2 className="text-3xl font-black italic tracking-tight text-white">Update <span className="text-primary not-italic">Details</span></h2>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">Editing {editingEmployee.employeeId}</p>
                        </div>

                        <form onSubmit={handleEditEmployee} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-primary/50 text-base font-bold text-white transition-all italic"
                                    value={editingEmployee.name}
                                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-primary/50 text-base font-bold text-white transition-all italic"
                                    value={editingEmployee.email}
                                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-primary py-6 rounded-lg font-black italic tracking-widest text-sm text-white disabled:opacity-20 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center space-x-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isSubmitting ? 'Saving...' : (
                                    <>
                                        <span>Save Changes</span>
                                        <Edit2 className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EmployeeManagement;

