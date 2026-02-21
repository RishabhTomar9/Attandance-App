import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';

// Components
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerRegister from './pages/owner/OwnerRegister';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ScannerLogin from './pages/scanner/ScannerLogin';
import KioskScanner from './pages/scanner/KioskScanner';

import Loader from './components/UI/Loader';

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
                    <AppRoutes />
                </Router>
            </UIProvider>
        </AuthProvider>
    );
}

export default App;

