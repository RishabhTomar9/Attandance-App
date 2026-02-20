import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, QrCode, Calendar, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { auth } from '../../firebase/config';

// Sub-components
import EmployeeOverview from './EmployeeOverview';
import QRGenerator from './QRGenerator';
import EmployeeCalendar from './EmployeeCalendar';

const EmployeeDashboard = () => {
    const location = useLocation();
    const { userData } = useAuth();
    const { showToast, confirm } = useUI();

    const handleLogout = async () => {
        const ok = await confirm({
            title: 'End Session',
            message: 'You will be signed out of your employee hub. Generate a new QR before leaving if you haven\'t punched out yet.',
            confirmText: 'SIGN OUT',
            cancelText: 'STAY',
            danger: true
        });
        if (!ok) return;
        showToast('Session terminated', 'info');
        auth.signOut();
    };

    const isActive = (path) => {
        if (path === '/employee' && location.pathname === '/employee') return true;
        if (path !== '/employee' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="min-h-screen bg-black pb-24 text-white">
            {/* Top Bar */}
            <header className="p-5 flex justify-between items-center sticky top-0 z-40 bg-black/70 backdrop-blur-2xl border-b border-white/5">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary p-[1px] shadow-neon">
                        <div className="w-full h-full rounded-xl bg-black flex items-center justify-center overflow-hidden">
                            <img src={userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.name}&background=0f172a&color=10b981&bold=true`} alt="profile" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Employee Hub</p>
                        <h2 className="text-sm font-bold">{userData?.name || 'User'}</h2>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95">
                        <Bell className="w-5 h-5 text-gray-400" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
                    >
                        <LogOut className="w-5 h-5 text-red-500" />
                    </button>
                </div>
            </header>

            <main className="p-6 max-w-2xl mx-auto">
                <Routes>
                    <Route index element={<EmployeeOverview />} />
                    <Route path="qr" element={<QRGenerator />} />
                    <Route path="calendar" element={<EmployeeCalendar />} />
                </Routes>
            </main>

            <nav className="bottom-nav px-6">
                <Link to="/employee" className={`nav-item ${isActive('/employee') ? 'active' : ''}`}>
                    <div className="nav-item-icon">
                        <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
                </Link>

                <Link to="/employee/qr" className="relative -top-6 group">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-primary to-accent p-[2px] shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform duration-300">
                        <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                            <QrCode className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-widest text-primary uppercase">Punch</span>
                </Link>

                <Link to="/employee/calendar" className={`nav-item ${isActive('/employee/calendar') ? 'active' : ''}`}>
                    <div className="nav-item-icon">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Logs</span>
                </Link>
            </nav>
        </div>
    );
};

export default EmployeeDashboard;

