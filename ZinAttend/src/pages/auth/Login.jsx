import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { Lock, ArrowRight, Building, UserCog, Users } from "lucide-react";

const Login = () => {
    const { loginWithGoogle, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";
    
    // Tier Selection State
    const [tier, setTier] = useState('manager'); // Default to manager or employee

    useEffect(() => {
        if (user.uid) {
            if (user.role) {
                if (from && from !== "/" && from !== "/login") navigate(from);
                else {
                    if (user.role === 'owner') navigate("/owner");
                    else if (user.role === 'manager') navigate("/manager");
                    else if (user.role === 'employee') navigate("/employee");
                }
            } else {
                navigate("/register-site"); // Or Join Site
            }
        }
    }, [user, navigate, from]);

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error("Failed to login", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                <div className="space-y-2">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                        <Lock className="text-blue-600" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">ZinAttend</h1>
                    <p className="text-slate-500">Secure Biometric Attendance</p>
                </div>

                {/* TIER SELECTION TABS */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <Tab 
                        active={tier==='owner'} 
                        onClick={() => setTier('owner')} 
                        icon={<Building size={14}/>} 
                        label="Owner" 
                    />
                    <Tab 
                        active={tier==='manager'} 
                        onClick={() => setTier('manager')} 
                        icon={<UserCog size={14}/>} 
                        label="Manager" 
                    />
                    <Tab 
                        active={tier==='employee'} 
                        onClick={() => setTier('employee')} 
                        icon={<Users size={14}/>} 
                        label="Employee" 
                    />
                </div>
                
                <div className="space-y-6 pt-2">
                    <p className="text-sm text-slate-500">
                        {tier === 'owner' && "Control your organization settings."}
                        {tier === 'manager' && "Manage team and attendance."}
                        {tier === 'employee' && "Mark your daily attendance."}
                    </p>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md group"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        <span className="font-semibold text-slate-700 group-hover:text-slate-900">
                            Continue as {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </span>
                        <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    {tier === 'owner' && (
                        <p className="text-xs text-slate-400 mt-2">
                            New Owner? Sign in to create an organization.
                        </p>
                    )}
                </div>

                <div className="text-center pt-2">
                    <p className="text-xs text-slate-400">
                        Secure Access • Google Identity
                    </p>
                </div>
            </div>
        </div>
    );
};

const Tab = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
    >
        {icon} {label}
    </button>
);

export default Login;
