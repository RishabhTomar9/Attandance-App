import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RoleBasedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user.uid) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If user is logged in but has no role, send to registration
    // EXCEPT if they are already ON the registration page (to avoid loop, handled by routes usually but checking here is safe)
    if (!user.role && location.pathname !== '/register-site') {
        return <Navigate to="/register-site" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect logic
        if (user.role === 'owner') return <Navigate to="/owner" replace />;
        if (user.role === 'manager') return <Navigate to="/manager" replace />;
        if (user.role === 'employee') return <Navigate to="/employee" replace />;

        // Fallback if role is unfamiliar or null (though null is caught above)
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default RoleBasedRoute;
