import Card from "../../components/ui/Card";
import { Users, Building2, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";

const OwnerDashboard = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Site Overview</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Last updated: Just now</span>
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <RefreshCw size={16} className="text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Employees" value="124" icon={<Users className="text-blue-600" />} />
                <StatCard title="Active Sites" value="3" icon={<Building2 className="text-indigo-600" />} />
                <StatCard title="Attendance Rate" value="94%" icon={<TrendingUp className="text-emerald-600" />} />
                <StatCard title="Late Arrivals" value="12" icon={<AlertCircle className="text-amber-600" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Real-time Activity">
                    <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <TrendingUp className="text-slate-300 mb-2" size={32} />
                        <span className="text-slate-400 font-medium">Activity Chart Placeholder</span>
                    </div>
                </Card>
                <Card title="Site Performance Metrics">
                    <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <Building2 className="text-slate-300 mb-2" size={32} />
                        <span className="text-slate-400 font-medium">Performance Metrics Placeholder</span>
                    </div>
                </Card>
            </div>
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

export default OwnerDashboard;
