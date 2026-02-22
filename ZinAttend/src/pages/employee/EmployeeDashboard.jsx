import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, QrCode, History, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { auth } from '../../firebase/config';
import BrandingFooter from '../../components/UI/BrandingFooter';


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
            <header className="px-6 py-4 flex justify-between items-center sticky top-0 z-40 bg-black/80 backdrop-blur-2xl border-b border-white/5">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent p-[1.5px] group overflow-hidden">
                            <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center overflow-hidden">
                                <img src={userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.name}&background=020617&color=3b82f6&bold=true`} alt="profile" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-black rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">{userData?.siteName || 'ZinAttend Node'}</p>
                        <h2 className="text-base font-black tracking-tight italic">{userData?.name || 'Authorized Member'}</h2>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {/* <button className="relative p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all group">
                        <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-black"></span>
                    </button> */}
                    <button
                        onClick={handleLogout}
                        className="p-2.5 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/15 transition-all active:scale-95 group"
                    >
                        <LogOut className="w-5 h-5 text-rose-500/50 group-hover:text-rose-500 transition-colors" />
                    </button>
                </div>
            </header>


            <main className="p-6 max-w-2xl mx-auto">
                <Routes>
                    <Route index element={<EmployeeOverview />} />
                    <Route path="qr" element={<QRGenerator />} />
                    <Route path="calendar" element={<EmployeeCalendar />} />
                </Routes>
                <BrandingFooter className="mt-12 opacity-50" />
            </main>


            <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-3xl border-t border-white/5 px-4 pt-4 pb-8 flex justify-around items-center z-50">
                <Link to="/employee" className={`flex flex-col items-center space-y-1 group transition-all duration-300 ${isActive('/employee') ? 'text-primary' : 'text-gray-500 hover:text-gray-400'}`}>
                    <div className={`p-2 rounded-2xl transition-all duration-500 ${isActive('/employee') ? 'bg-primary/10' : 'group-hover:bg-white/5'}`}>
                        <Home className={`w-6 h-6 ${isActive('/employee') ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isActive('/employee') ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>Home</span>
                </Link>

                <div className="relative group">
                    <Link to="/employee/qr" className="flex flex-col items-center space-y-1">
                        <div className={`w-18 h-18 rounded-[2rem] bg-gradient-to-tr from-primary to-accent p-[2px] shadow-[0_10px_30px_rgba(59,130,246,0.3)] group-hover:scale-110 group-active:scale-95 transition-all duration-500 relative overflow-hidden`}>
                            <div className="w-full h-full rounded-[2rem] bg-black flex items-center justify-center relative z-10">
                                <img src="/icon-512.png" className="w-9 h-9 text-white group-hover:rotate-12 transition-transform duration-500" />
                            </div>
                            <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Punch</span>
                    </Link>
                </div>

                <Link to="/employee/calendar" className={`flex flex-col items-center space-y-1 group transition-all duration-300 ${isActive('/employee/calendar') ? 'text-primary' : 'text-gray-500 hover:text-gray-400'}`}>
                    <div className={`p-2 rounded-2xl transition-all duration-500 ${isActive('/employee/calendar') ? 'bg-primary/10' : 'group-hover:bg-white/5'}`}>
                        <History className={`w-6 h-6 ${isActive('/employee/calendar') ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isActive('/employee/calendar') ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>History</span>
                </Link>
            </nav>

        </div>
    );
};

export default EmployeeDashboard;

