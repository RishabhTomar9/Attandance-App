import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import RoleBasedRoute from "./roleRoutes";

// Pages
import Login from "../pages/auth/Login";
import RegisterSite from "../pages/onboarding/RegisterSite";
import JoinSite from "../pages/onboarding/JoinSite"; // New!
import OwnerDashboard from "../pages/owner/OwnerDashboard";
import OwnerSettings from "../pages/owner/OwnerSettings";
import EmployeeList from "../pages/owner/EmployeeList"; // New!
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import EmployeeDashboard from "../pages/employee/EmployeeDashboard";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register-site" element={<RegisterSite />} />
            <Route path="/join" element={<JoinSite />} /> {/* New! */}

            {/* Protected Routes */}
            <Route element={<AppLayout />}>
                {/* Redirect root to login */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Owner Routes */}
                <Route
                    path="/owner/*"
                    element={
                        <RoleBasedRoute allowedRoles={["owner"]}>
                            <Routes>
                                <Route index element={<OwnerDashboard />} />
                                <Route path="managers" element={<div className="p-4">Managers Page Placeholder</div>} />
                                <Route path="employees" element={<EmployeeList />} /> {/* New! */}
                                <Route path="reports" element={<div className="p-4">Reports Page Placeholder</div>} />
                                <Route path="settings" element={<OwnerSettings />} />
                                <Route path="*" element={<Navigate to="/owner" replace />} />
                            </Routes>
                        </RoleBasedRoute>
                    }
                />

                {/* Manager Routes */}
                <Route
                    path="/manager/*"
                    element={
                        <RoleBasedRoute allowedRoles={["manager"]}>
                            <Routes>
                                <Route index element={<ManagerDashboard />} />
                                <Route path="employees" element={<div className="p-4">Employees View Placeholder</div>} />
                                <Route path="reports" element={<div className="p-4">Reports View Placeholder</div>} />
                                <Route path="*" element={<Navigate to="/manager" replace />} />
                            </Routes>
                        </RoleBasedRoute>
                    }
                />

                {/* Employee Routes */}
                <Route
                    path="/employee/*"
                    element={
                        <RoleBasedRoute allowedRoles={["employee"]}>
                            <Routes>
                                <Route index element={<EmployeeDashboard />} />
                                <Route path="calendar" element={<div className="p-4">Calendar View Placeholder</div>} />
                                <Route path="*" element={<Navigate to="/employee" replace />} />
                            </Routes>
                        </RoleBasedRoute>
                    }
                />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default AppRoutes;
