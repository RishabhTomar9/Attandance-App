import { useAuth } from "../../context/AuthContext";
import { LogOut, Bell, Menu, Shield, User, Briefcase } from "lucide-react";

const Navbar = () => {
    const { logout, user } = useAuth();

    const getRoleBadge = () => {
        switch (user.role) {
            case 'owner': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><Shield size={10} /> Owner</span>;
            case 'manager': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"><Briefcase size={10} /> Manager</span>;
            case 'employee': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><User size={10} /> Employee</span>;
            default: return null;
        }
    }

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10">
            <div className="flex items-center gap-4">
                <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                    <Menu size={24} />
                </button>
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold text-slate-800 hidden sm:block leading-tight">
                        {user.role ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal` : 'Dashboard'}
                    </h2>
                    {user.siteId && <span className="text-xs text-slate-500 hidden sm:block">Site ID: {user.siteId}</span>}
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
                {getRoleBadge()}
                <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full relative transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                </button>
                <div className="h-8 w-px bg-slate-200 mx-1"></div>
                <div className="flex items-center gap-2">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                            {user.name?.charAt(0) || "U"}
                        </div>
                    )}
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
