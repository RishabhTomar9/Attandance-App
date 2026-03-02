import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import Loader from './components/UI/Loader';

// Lazy load pages for better performance
const Login = React.lazy(() => import('./pages/Login'));
const RoleSelection = React.lazy(() => import('./pages/RoleSelection'));
const OwnerDashboard = React.lazy(() => import('./pages/owner/OwnerDashboard'));
const OwnerRegister = React.lazy(() => import('./pages/owner/OwnerRegister'));
const EmployeeDashboard = React.lazy(() => import('./pages/employee/EmployeeDashboard'));
const ScannerLogin = React.lazy(() => import('./pages/scanner/ScannerLogin'));
const KioskScanner = React.lazy(() => import('./pages/scanner/KioskScanner'));

const ProtectedRoute = ({ children, role }) => {
    const { user, userData, loading } = useAuth();

    if (loading) return <Loader />;
    if (!user) return <Navigate to="/login" replace />;

    if (!userData && !loading) return <Navigate to="/login" replace />;

    if (role && userData?.role !== role) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const AppRoutes = () => {
    const { user, userData, loading } = useAuth();

    if (loading) return <Loader />;

    return (
        <Routes>
            <Route path="/login" element={<RoleSelection />} />
            <Route path="/login/owner" element={<Login role="owner" />} />
            <Route path="/login/employee" element={<Login role="employee" />} />

            {/* Scanner Kiosk Routes (no auth required) */}
            <Route path="/scanner-login" element={<ScannerLogin />} />
            <Route path="/scanner" element={<KioskScanner />} />

            {/* Owner Routes */}
            <Route path="/owner/register" element={
                <ProtectedRoute role="owner">
                    <OwnerRegister />
                </ProtectedRoute>
            } />
            <Route path="/owner/*" element={
                <ProtectedRoute role="owner">
                    <OwnerDashboard />
                </ProtectedRoute>
            } />

            {/* Employee Routes */}
            <Route path="/employee/*" element={
                <ProtectedRoute role="employee">
                    <EmployeeDashboard />
                </ProtectedRoute>
            } />

            <Route path="/" element={
                !user ? (
                    <Navigate to="/login" replace />
                ) : !userData ? (
                    <Loader />
                ) : (
                    userData.role === 'owner' ? (
                        userData.siteId ? <Navigate to="/owner" replace /> : <Navigate to="/owner/register" replace />
                    ) : (
                        <Navigate to="/employee" replace />
                    )
                )
            } />
        </Routes>
    );
};

function App() {
    return (
        <AuthProvider>
            <UIProvider>
                <Router>
                    <React.Suspense fallback={<Loader />}>
                        <AppRoutes />
                    </React.Suspense>
                </Router>
            </UIProvider>
        </AuthProvider>
    );
}

export default App;

