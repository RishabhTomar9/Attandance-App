import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { Building, Wifi, MapPin, Save, Loader2, Clock, ShieldAlert } from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const OwnerSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [siteData, setSiteData] = useState(null);
    const [msg, setMsg] = useState("");

    // Policy State (Defaults if not set)
    const [policy, setPolicy] = useState({
        punchInStart: "09:00",
        lateAfterMinutes: 15,
        halfDayAfterMinutes: 240, // 4 hours
        punchOutStart: "17:00"
    });

    useEffect(() => {
        const fetchSite = async () => {
            if (user?.siteId) {
                try {
                    const docRef = doc(db, "sites", user.siteId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setSiteData({ id: docSnap.id, ...data });

                        // Load Policy or keep defaults
                        if (data.policy) {
                            setPolicy({ ...policy, ...data.policy });
                        }
                    }
                } catch (err) {
                    console.error("Error fetching site settings:", err);
                }
            }
            setLoading(false);
        };
        fetchSite();
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg("");
        try {
            const docRef = doc(db, "sites", user.siteId);
            await updateDoc(docRef, {
                name: siteData.name,
                wifiSSID: siteData.wifiSSID,
                wifiPassword: siteData.wifiPassword,
                policy: policy // Save policy object
            });
            setMsg("Settings & Policy saved successfully.");
        } catch (err) {
            console.error("Error saving settings:", err);
            setMsg("Failed to save settings.");
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
    if (!siteData) return <div className="p-8 text-center text-red-500">Site data not found.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Site Configuration</h1>
                    <p className="text-slate-500">Manage security and attendance rules</p>
                </div>
                {msg && <span className={`text-sm font-medium ${msg.includes("Failed") ? "text-red-600" : "text-emerald-600"}`}>{msg}</span>}
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* 1. ATTENDANCE POLICY */}
                <Card title="Attendance Policy Rules">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Standard Start Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="time"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 outline-none"
                                        value={policy.punchInStart}
                                        onChange={(e) => setPolicy({ ...policy, punchInStart: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Official office opening time.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Standard End Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="time"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 outline-none"
                                        value={policy.punchOutStart}
                                        onChange={(e) => setPolicy({ ...policy, punchOutStart: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Minimum time to leave for full day.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
                            <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                <ShieldAlert size={16} className="text-amber-500" /> Late & Penalty Rules
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Late Mark Grace Period (mins)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none"
                                        value={policy.lateAfterMinutes}
                                        onChange={(e) => setPolicy({ ...policy, lateAfterMinutes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Auto Half-Day Threshold (mins)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none"
                                        value={policy.halfDayAfterMinutes}
                                        onChange={(e) => setPolicy({ ...policy, halfDayAfterMinutes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 2. ORG PROFILE */}
                <Card title="Organization Profile">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 outline-none"
                                    value={siteData.name}
                                    onChange={(e) => setSiteData({ ...siteData, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Total Employees</label>
                            <input type="text" disabled value="Managed via HR Tab" className="w-full px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 text-slate-500" />
                        </div>
                    </div>
                </Card>

                {/* 3. SECURITY & MAP */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Network Security">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Office WiFi Name (SSID)</label>
                                <div className="relative">
                                    <Wifi className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 outline-none"
                                        value={siteData.wifiSSID}
                                        onChange={(e) => setSiteData({ ...siteData, wifiSSID: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">WiFi Password</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none"
                                    value={siteData.wifiPassword}
                                    onChange={(e) => setSiteData({ ...siteData, wifiPassword: e.target.value })}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card title="Pinned Location">
                        <div className="h-48 rounded-lg overflow-hidden border border-slate-200 relative z-0">
                            {siteData.location && (
                                <MapContainer center={siteData.location} zoom={15} scrollWheelZoom={false} dragging={false} style={{ height: "100%", width: "100%" }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={siteData.location}></Marker>
                                    <Circle center={siteData.location} radius={siteData.radius || 50} pathOptions={{ fillColor: 'blue', fillOpacity: 0.1, color: 'blue' }} />
                                </MapContainer>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-center flex items-center justify-center gap-1">
                            <MapPin size={12} />
                            Location is locked. Contact support to move office.
                        </p>
                    </Card>
                </div>

                <div className="flex justify-end sticky bottom-6 z-10">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl flex items-center gap-2 disabled:opacity-70 transition-all transform hover:scale-105">
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Policy & Settings
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OwnerSettings;
