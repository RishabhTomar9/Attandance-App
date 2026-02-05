import Card from "../../components/ui/Card";
import { Users, Clock, AlertTriangle, FileBarChart } from "lucide-react";

const ManagerDashboard = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Employee Overview</h1>
                <p className="text-slate-500">Manager View</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="My Team" value="24" icon={<Users className="text-blue-600" />} />
                <StatCard title="Present Today" value="21" icon={<Clock className="text-emerald-600" />} />
                <StatCard title="Pending Approvals" value="3" icon={<AlertTriangle className="text-amber-600" />} />
            </div>

            <Card title="Team Attendance Details">
                <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <FileBarChart className="text-slate-300 mb-2" size={32} />
                    <span className="text-slate-400">Employee List & Status Table Placeholder</span>
                </div>
            </Card>
        </div>
    );
};

const StatCard = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
            {icon}
        </div>
    </div>
);

export default ManagerDashboard;
