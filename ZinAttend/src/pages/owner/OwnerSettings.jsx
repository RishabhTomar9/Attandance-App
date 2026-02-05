import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Card from "../../components/ui/Card";
import { Building, Wifi, MapPin, Save, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icon (reuse fix from RegisterSite if possible, but simplest to re-declare)
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

    useEffect(() => {
        const fetchSite = async () => {
            if (user?.siteId) {
                try {
                    const docRef = doc(db, "sites", user.siteId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setSiteData({ id: docSnap.id, ...docSnap.data() });
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
                wifiPassword: siteData.wifiPassword
            });
            setMsg("Settings saved successfully.");
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
                    <h1 className="text-2xl font-bold text-slate-800">Site Settings</h1>
                    <p className="text-slate-500">Manage your organization profile and security</p>
                </div>
                {msg && <span className={`text-sm font-medium ${msg.includes("Failed") ? "text-red-600" : "text-emerald-600"}`}>{msg}</span>}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <Card title="Organization Profile">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={siteData.name}
                                    onChange={(e) => setSiteData({ ...siteData, name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Total Employees</label>
                            <input type="text" disabled value="Coming Soon" className="w-full px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 text-slate-500" />
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Network Security">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Office WiFi Name (SSID)</label>
                                <div className="relative">
                                    <Wifi className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={siteData.wifiSSID}
                                        onChange={(e) => setSiteData({ ...siteData, wifiSSID: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">WiFi Password</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={siteData.wifiPassword}
                                    onChange={(e) => setSiteData({ ...siteData, wifiPassword: e.target.value })}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card title="Pinned Location">
                        <div className="h-48 rounded-lg overflow-hidden border border-slate-200 relative z-0">
                            <MapContainer center={siteData.location} zoom={15} scrollWheelZoom={false} dragging={false} style={{ height: "100%", width: "100%" }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Marker position={siteData.location}></Marker>
                                <Circle center={siteData.location} radius={siteData.radius || 50} pathOptions={{ fillColor: 'blue', fillOpacity: 0.1, color: 'blue' }} />
                            </MapContainer>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-center flex items-center justify-center gap-1">
                            <MapPin size={12} />
                            Location is locked. Contact support to move office.
                        </p>
                    </Card>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-70 transition-colors">
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OwnerSettings;
