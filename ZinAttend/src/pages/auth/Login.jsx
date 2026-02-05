import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect } from "react";
import { Lock, ArrowRight } from "lucide-react";

const Login = () => {
    const { loginWithGoogle, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    useEffect(() => {
        if (user.uid) {
            if (user.role) {
                if (from && from !== "/" && from !== "/login") {
                    navigate(from);
                } else {
                    if (user.role === 'owner') navigate("/owner");
                    else if (user.role === 'manager') navigate("/manager");
                    else if (user.role === 'employee') navigate("/employee");
                }
            } else {
                navigate("/register-site");
            }
        }
    }, [user, navigate, from]);

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            // Navigation handled by useEffect
        } catch (error) {
            console.error("Failed to login", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 relative overflow-hidden text-center">
                {/* Decorative backdrop */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                <div className="space-y-2">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                        <Lock className="text-blue-600" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">ZinAttend</h1>
                    <p className="text-slate-500">Secure Biometric Attendance</p>
                </div>

                <div className="space-y-6 pt-4">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md group"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        <span className="font-semibold text-slate-700 group-hover:text-slate-900">Sign in with Google</span>
                        <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-400">Secure Access</span>
                        </div>
                    </div>
                </div>

                <div className="text-center pt-2">
                    <p className="text-xs text-slate-400">
                        By signing in, you agree to our Terms & Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
