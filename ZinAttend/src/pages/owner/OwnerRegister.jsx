import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, Wifi, Clock, ShieldCheck, ChevronRight, Activity, Zap, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import BrandingFooter from '../../components/UI/BrandingFooter';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const ChangeView = ({ center }) => {
    const map = useMap();
    if (center && center[0] && center[1]) {
        map.setView(center, map.getZoom());
    }
    return null;
};


const OwnerRegister = () => {
    const { user } = useAuth();
    const { showToast } = useUI();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        siteName: '',
        ownerName: user?.displayName || '',
        email: user?.email || '',
        latitude: null,
        longitude: null,
        wifiSSID: '',
        wifiPassword: '',
        startTime: '09:00',
        endTime: '18:00',
        gracePeriod: 15,
        halfDayRules: 4,
        overtimeRules: 1,
        geoRadius: 100, // Locked to 100m
    });

    const getLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            showToast('GPS not available', 'error');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                showToast('GPS uplink synchronized', 'success');
            },
            () => {
                setError('GPS access denied. Please enable location.');
                showToast('GPS permission denied', 'error');
            }
        );
    };

    const handleRegister = async () => {
        if (!formData.latitude || !formData.longitude) {
            setError('Location is required.');
            showToast('Get location first', 'warning');
            return;
        }
        setLoading(true);
        try {
            const siteId = `site_${Math.random().toString(36).substr(2, 9)}`;

            await setDoc(doc(db, 'sites', siteId), {
                ...formData,
                siteId,
                ownerId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await updateDoc(doc(db, 'users', user.uid), {
                siteId,
                isRegistered: true,
                role: 'owner'
            });

            showToast('Success!', 'success');
            navigate('/owner');
        } catch (err) {
            console.error(err);
            setError('Something went wrong.');
            showToast('Failed to save', 'error');
        } finally {
            setLoading(false);
        }
    };


    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-lg animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-lg animate-pulse-slow"></div>

            <div className="w-full max-w-md z-10 space-y-8">
                <header className="text-center space-y-4">
                    <div className="inline-flex items-center space-x-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 mb-2">
                        <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Setup Office</span>
                    </div>
                    <h1 className="text-5xl font-black italic tracking-tighter text-white">Register</h1>
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.4em]">Step {step}/4</p>
                </header>


                {error && (
                    <div className="glass-card p-4 border-red-500/20 bg-red-500/5 flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-xs font-bold text-red-400 font-mono italic">"{error}"</p>
                    </div>
                )}

                <div className="glass-card p-10 bg-black/60 backdrop-blur-3xl rounded-lg border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50"></div>

                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700 relative z-10">

                            <div className="flex items-center space-x-4 pb-6 border-b border-white/5">
                                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                    <ShieldCheck className="text-primary w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black italic tracking-tight uppercase text-white">Office <span className="text-primary not-italic">Info</span></h3>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Office Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. My Company Office"
                                        className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-primary/50 transition-all text-base font-bold placeholder:text-gray-800 italic"
                                        value={formData.siteName}
                                        onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Admin Email</label>
                                    <div className="w-full bg-white/[0.02] border border-white/5 rounded-lg p-6 text-gray-600 text-base font-bold select-none flex items-center justify-between italic">
                                        <span className="truncate">{formData.email}</span>
                                        <ShieldCheck className="w-4 h-4 text-emerald-500/40" />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={nextStep}
                                disabled={!formData.siteName}
                                className="w-full bg-primary py-6 rounded-lg font-black italic tracking-widest text-sm text-white disabled:opacity-20 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center space-x-3 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                            >
                                <span>Next</span>
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}



                    {step === 2 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-700 relative z-10">

                            <div className="flex items-center space-x-4 pb-6 border-b border-white/5">
                                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                    <MapPin className="text-rose-500 w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black italic tracking-tight uppercase text-white">Office <span className="text-rose-500 not-italic">Location</span></h3>
                            </div>

                            <div className="bg-white/[0.03] p-1 rounded-lg border border-white/5 overflow-hidden space-y-0">
                                {formData.latitude ? (
                                    <div className="h-64 w-full relative z-10">
                                        <MapContainer
                                            center={[formData.latitude, formData.longitude]}
                                            zoom={16}
                                            style={{ height: '100%', width: '100%' }}
                                            zoomControl={true}
                                        >
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <Circle
                                                center={[formData.latitude, formData.longitude]}
                                                radius={100}
                                                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 2 }}
                                            />
                                            <Marker position={[formData.latitude, formData.longitude]} />
                                            <ChangeView center={[formData.latitude, formData.longitude]} />
                                        </MapContainer>
                                        <div className="absolute top-4 right-4 z-20 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 flex items-center space-x-2">
                                            <Zap className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-xs">100m Radius</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-48 flex items-center justify-center bg-black/40 border border-white/5 mx-6 mt-6 rounded-lg">
                                        <div className="text-center space-y-2">
                                            <RefreshCw className="w-8 h-8 text-gray-800 mx-auto animate-spin-slow" />
                                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Getting Location...</p>
                                        </div>
                                    </div>
                                )}

                                <div className="p-8 space-y-8">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-gray-600 uppercase tracking-[0.3em]">Location</span>
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-3 h-3 rounded-full ${formData.latitude ? "bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-amber-500"}`}></div>
                                            <span className={`text-xs font-black uppercase tracking-widest ${formData.latitude ? "text-emerald-500" : "text-amber-500"}`}>
                                                {formData.latitude ? "Active" : "Waiting"}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={getLocation}
                                        className="w-full bg-white/5 border border-white/10 hover:bg-white/10 py-6 rounded-lg font-black text-xs tracking-[0.2em] transition-all uppercase text-white active:scale-95 shadow-lg"
                                    >
                                        {formData.latitude ? "Refresh Location" : "Get Office Location"}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-blue-500/5 p-6 rounded-lg border border-blue-500/10 flex items-start space-x-4">
                                <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-gray-500 font-bold leading-relaxed">
                                    The detection radius is locked at <span className="text-blue-400">100m</span> for reliable scans.
                                </p>
                            </div>

                            <div className="flex items-center space-x-6 pt-4">
                                <button onClick={prevStep} className="flex-1 text-xs font-black tracking-widest text-gray-600 hover:text-white transition-colors uppercase italic">Back</button>
                                <button
                                    onClick={nextStep}
                                    disabled={!formData.latitude}
                                    className="flex-[2] bg-primary py-6 rounded-lg font-black italic tracking-widest text-base text-white disabled:opacity-20 shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}


                    {step === 3 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-700 relative z-10">

                            <div className="flex items-center space-x-4 pb-6 border-b border-white/5">
                                <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
                                    <Wifi className="text-sky-500 w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black italic tracking-tight uppercase text-white">WiFi <span className="text-sky-500 not-italic">Setup</span></h3>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">WiFi Name (SSID)</label>
                                    <input
                                        type="text"
                                        placeholder="Office WiFi Name"
                                        className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-sky-500/50 transition-all text-base font-bold placeholder:text-gray-800 italic"
                                        value={formData.wifiSSID}
                                        onChange={(e) => setFormData({ ...formData, wifiSSID: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">WiFi Password</label>
                                    <input
                                        type="password"
                                        placeholder="Enter Password"
                                        className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-sky-500/50 text-base font-bold placeholder:text-gray-800 italic"
                                        value={formData.wifiPassword}
                                        onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-6 pt-4">
                                <button onClick={prevStep} className="flex-1 text-xs font-black tracking-widest text-gray-600 hover:text-white transition-colors uppercase italic">Back</button>
                                <button
                                    onClick={nextStep}
                                    disabled={!formData.wifiSSID}
                                    className="flex-[2] bg-sky-500 py-6 rounded-lg font-black italic tracking-widest text-base text-white disabled:opacity-20 shadow-[0_0_40px_rgba(14,165,233,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}


                    {step === 4 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-700 relative z-10">

                            <div className="flex items-center space-x-4 pb-6 border-b border-white/5">
                                <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                                    <Clock className="text-secondary w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black italic tracking-tight uppercase text-white">Office <span className="text-secondary not-italic">Hours</span></h3>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Start Time</label>
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-secondary/50 text-lg font-black text-white italic"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 text-right">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-1">End Time</label>
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-secondary/50 text-lg font-black text-white italic"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Late Margin (Min)</label>
                                <input
                                    type="number"
                                    className="w-full bg-white/5 border border-white/5 rounded-lg p-6 focus:outline-none focus:border-secondary/50 text-lg font-black text-white italic"
                                    value={formData.gracePeriod}
                                    onChange={(e) => setFormData({ ...formData, gracePeriod: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="flex items-center space-x-6 pt-4">
                                <button onClick={prevStep} className="flex-1 text-xs font-black tracking-widest text-gray-600 hover:text-white transition-colors uppercase italic">Back</button>
                                <button
                                    onClick={handleRegister}
                                    disabled={loading}
                                    className="flex-[2] bg-emerald-500 py-6 rounded-lg font-black italic tracking-widest text-base text-black shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {loading ? "Checking..." : "Finish"}
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center space-x-3 pt-4">
                    {[1, 2, 3, 4].map(s => (
                        <div
                            key={s}
                            className={`h-1 rounded-lg transition-all duration-500 ${step >= s ? "bg-primary w-8 shadow-neon" : "bg-white/10 w-4"}`}
                        />
                    ))}
                </div>

                <BrandingFooter className="opacity-40" />
            </div>
        </div>


    );
};

export default OwnerRegister;

