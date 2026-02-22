import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Users, QrCode, Settings, LogOut, Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import BrandingFooter from '../../components/UI/BrandingFooter';


// Sub-components
import OwnerOverview from './OwnerOverview';
import EmployeeManagement from './EmployeeManagement';
import EmployeeDetail from './EmployeeDetail';
import QRScanner from './QRScanner';
import OwnerSettings from './OwnerSettings';

const OwnerDashboard = () => {
    const location = useLocation();
    const { userData } = useAuth();
    const { showToast, confirm } = useUI();

    const handleLogout = async () => {
        const ok = await confirm({
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            confirmText: 'LOGOUT',
            cancelText: 'CANCEL',
            danger: true
        });
        if (!ok) return;
        showToast('Logged out', 'info');
        await signOut(auth);
    };

    const isActive = (path) => {
        if (path === '/owner' && location.pathname === '/owner') return true;
        if (path !== '/owner' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="min-h-screen bg-black pb-24 text-white">
            {/* Top Bar */}
            <header className="p-5 flex justify-between items-center sticky top-0 z-40 bg-black/70 backdrop-blur-2xl border-b border-white/5">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent p-[1px] shadow-neon">
                        <div className="w-full h-full rounded-lg bg-black flex items-center justify-center overflow-hidden">
                            <img src={userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.name}&background=0f172a&color=3b82f6&bold=true`} alt="profile" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest flex items-center">
                            <ShieldCheck className="w-3 h-3 mr-1 text-primary" />
                            Admin
                        </p>
                        <h2 className="text-xl uppercase font-bold">{userData?.siteName || 'ZinAttend'}</h2>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleLogout}
                        className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
                    >
                        <LogOut className="w-5 h-5 text-red-500" />
                    </button>
                </div>
            </header>

            <main className="p-6">
                <Routes>
                    <Route index element={<OwnerOverview />} />
                    <Route path="employees" element={<EmployeeManagement />} />
                    <Route path="employees/:employeeDocId" element={<EmployeeDetail />} />
                    <Route path="scanner" element={<QRScanner />} />
                    <Route path="settings" element={<OwnerSettings />} />
                </Routes>
                <BrandingFooter className="mt-12 opacity-50" />
            </main>


            <nav className="bottom-nav px-4">
                <Link to="/owner" className={`nav-item ${isActive('/owner') ? 'active' : ''}`}>
                    <div className="nav-item-icon">
                        <Home className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
                </Link>
                <Link to="/owner/employees" className={`nav-item ${isActive('/owner/employees') ? 'active' : ''}`}>
                    <div className="nav-item-icon">
                        <Users className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Staff</span>
                </Link>

                <Link to="/owner/scanner" className="relative -top-6 group">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-tr from-primary to-accent p-[2px] shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform duration-300">
                        <div className="w-full h-full rounded-lg bg-black flex items-center justify-center">
                            <img src="/icon-512.png" className="w-25 h-20 text-white" />
                        </div>
                    </div>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-widest text-primary uppercase">Scan</span>
                </Link>

                <Link to="/owner/settings" className={`nav-item ${isActive('/owner/settings') ? 'active' : ''}`}>
                    <div className="nav-item-icon">
                        <Settings className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Setup</span>
                </Link>
            </nav>
        </div>
    );
};

export default OwnerDashboard;

