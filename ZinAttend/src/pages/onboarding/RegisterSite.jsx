import { useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building, MapPin, Wifi, Lock, ArrowRight, Loader2, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { doc, updateDoc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;


const RegisterSite = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        wifiSSID: "",
        wifiPassword: "",
    });
    const [location, setLocation] = useState({ lat: 40.7128, lng: -74.0060 }); // Default NY
    const [locationSelected, setLocationSelected] = useState(false);

    // Map Event Handler
    const LocationMarker = () => {
        useMapEvents({
            click(e) {
                setLocation(e.latlng);
                setLocationSelected(true);
            },
        });
        return locationSelected ? (
            <>
                <Marker position={location}></Marker>
                <Circle center={location} radius={50} pathOptions={{ fillColor: 'blue', fillOpacity: 0.1, color: 'blue' }} />
            </>
        ) : null;
    };


    // Loading / Redirect Logic (Same as before)
    if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
    if (!user || !user.uid) return <Navigate to="/login" replace />;
    if (user.role) {
        if (user.role === 'owner') navigate("/owner");
        else if (user.role === 'manager') navigate("/manager");
        else if (user.role === 'employee') navigate("/employee");
    }

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setLocationSelected(true);
            }, (error) => {
                console.error("Error getting location:", error);
                alert("Could not get your current location.");
            });
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    };

    const handleCreateSite = async (e) => {
        e.preventDefault();

        if (!formData.name || !locationSelected || !formData.wifiSSID || !formData.wifiPassword) {
            alert("Please fill in all fields and select a location on the map.");
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create Site Document
            // Using a new document ID
            const siteRef = doc(collection(db, "sites"));
            const siteId = siteRef.id;

            await setDoc(siteRef, {
                name: formData.name,
                ownerId: user.uid,
                location: {
                    lat: location.lat,
                    lng: location.lng
                },
                radius: 50, // Fixed 50m
                wifiSSID: formData.wifiSSID,
                wifiPassword: formData.wifiPassword,
                createdAt: serverTimestamp()
            });

            // 2. Update User Document
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                role: "owner",
                siteId: siteId
            });

            // Reload to refresh context
            window.location.reload();
        } catch (error) {
            console.error("Error creating site:", error);
            alert("Error creating site. Please try again.");
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-slate-900">Set Up Your Organization</h1>
                    <p className="text-slate-500">Configure your office location and security settings</p>
                </div>

                <form onSubmit={handleCreateSite} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Details */}
                    <div className="space-y-6">
                        {/* Org Details */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Building size={20} className="text-blue-600" /> Organization Details
                            </h2>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Acme Corp"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Network Security */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Wifi size={20} className="text-indigo-600" /> Network Security
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Office WiFi Name (SSID)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Office_WiFi_5G"
                                        value={formData.wifiSSID}
                                        onChange={(e) => setFormData({ ...formData, wifiSSID: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">WiFi Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="SecurePassword123"
                                            value={formData.wifiPassword}
                                            onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                        <Info size={12} /> Used for employee verification only.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Map */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                    <MapPin size={20} className="text-rose-600" /> Office Location
                                </h2>
                                <button
                                    type="button"
                                    onClick={getLocation}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                    <MapPin size={14} /> Use My Location
                                </button>
                            </div>

                            <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden border border-slate-200 relative z-0">
                                <MapContainer center={location} zoom={15} style={{ height: "100%", width: "100%" }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <LocationMarker />
                                </MapContainer>
                                {!locationSelected && (
                                    <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center pointer-events-none z-[1000]">
                                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-slate-700">
                                            Click on map to pin location
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-3 text-center">
                                A 50m geolocation radius will be enforced for attendance.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed">
                            {submitting ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>Complete Setup <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterSite;
