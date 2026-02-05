import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

const AppLayout = () => {
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-inter">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <Navbar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
