import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/auth/Login";
import JoinSite from "../pages/onboarding/JoinSite";
import EmployeeDashboard from "../pages/employee/EmployeeDashboard";
import FaceRegistration from "../pages/employee/FaceRegistration";
import AttendanceCalendar from "../pages/employee/AttendanceCalendar"; // Added
import OwnerDashboard from "../pages/owner/OwnerDashboard";
import ManagersList from "../pages/owner/ManagersList";
import EmployeeList from "../pages/owner/EmployeeList";
import AttendanceReports from "../pages/owner/AttendanceReports";
import Analytics from "../pages/owner/Analytics"; // Added
import ManagerEmployees from "../pages/manager/ManagerEmployees";
import ManagerScanner from "../pages/manager/ManagerScanner";
import OwnerSettings from "../pages/owner/OwnerSettings";

import RegisterSite from "../pages/onboarding/RegisterSite";

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/join",
        element: <JoinSite />,
    },
    {
        path: "/register-site",
        element: <RegisterSite />,
    },
    {
        path: "/",
        element: <AppLayout />,
        children: [
            { index: true, element: <Navigate to="/login" replace /> },

            // OWNER ROUTES
            {
                element: <ProtectedRoute allowedRoles={['owner']} />,
                children: [
                    { path: "owner", element: <OwnerDashboard /> },
                    { path: "owner/managers", element: <ManagersList /> },
                    { path: "owner/employees", element: <EmployeeList /> },
                    { path: "owner/reports", element: <AttendanceReports /> },
                    { path: "owner/analytics", element: <Analytics /> },
                    { path: "owner/settings", element: <OwnerSettings /> },
                ]
            },

            // MANAGER ROUTES
            {
                element: <ProtectedRoute allowedRoles={['manager', 'owner']} />,
                children: [
                    { path: "manager", element: <ManagerEmployees /> },
                    { path: "manager/employees", element: <ManagerEmployees /> },
                    { path: "manager/scan", element: <ManagerScanner /> },
                    { path: "manager/reports", element: <AttendanceReports /> },
                ]
            },

            // EMPLOYEE ROUTES
            {
                element: <ProtectedRoute allowedRoles={['employee', 'manager', 'owner']} />,
                children: [
                    { path: "employee", element: <EmployeeDashboard /> },
                    { path: "employee/register-face", element: <FaceRegistration /> },
                    { path: "employee/calendar", element: <AttendanceCalendar /> },
                ]
            }
        ],
    },
]);

export default router;
