import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Users, UserCog, FileText, Settings, Calendar } from "lucide-react";

const Sidebar = () => {
    const { user } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const renderLinks = () => {
        switch (user.role) {
            case "owner":
                return (
                    <>
                        <SidebarLink to="/owner" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive("/owner")} />
                        <SidebarLink to="/owner/managers" icon={<UserCog size={20} />} label="Managers" active={isActive("/owner/managers")} />
                        <SidebarLink to="/owner/employees" icon={<Users size={20} />} label="Employees" active={isActive("/owner/employees")} />
                        <SidebarLink to="/owner/reports" icon={<FileText size={20} />} label="Reports" active={isActive("/owner/reports")} />
                        <SidebarLink to="/owner/settings" icon={<Settings size={20} />} label="Settings" active={isActive("/owner/settings")} />
                    </>
                );
            case "manager":
                return (
                    <>
                        <SidebarLink to="/manager" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive("/manager")} />
                        <SidebarLink to="/manager/employees" icon={<Users size={20} />} label="Employees" active={isActive("/manager/employees")} />
                        <SidebarLink to="/manager/reports" icon={<FileText size={20} />} label="Reports" active={isActive("/manager/reports")} />
                    </>
                );
            case "employee":
                return (
                    <>
                        <SidebarLink to="/employee" icon={<LayoutDashboard size={20} />} label="My Attendance" active={isActive("/employee")} />
                        <SidebarLink to="/employee/calendar" icon={<Calendar size={20} />} label="Calendar View" active={isActive("/employee/calendar")} />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="hidden md:flex flex-col w-64 h-screen bg-slate-900 text-white shadow-xl transition-all duration-300">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-2xl font-bold tracking-wider text-blue-400">ZinAttend</h1>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Workspace</p>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                {renderLinks()}
            </nav>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-md">
                        {user.name?.charAt(0) || "U"}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-slate-400 capitalize truncate">{user.role}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SidebarLink = ({ to, icon, label, active }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${active
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
    >
        <span className={`${active ? "text-white" : "text-slate-400 group-hover:text-white"}`}>
            {icon}
        </span>
        <span className="font-medium">{label}</span>
    </Link>
);

export default Sidebar;
