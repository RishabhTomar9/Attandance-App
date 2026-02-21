import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, Wifi, Clock, ShieldCheck, ChevronRight, Activity, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import BrandingFooter from '../../components/UI/BrandingFooter';


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
        geoRadius: 50,
    });

    const getLocation = () => {
        if (!navigator.geolocation) {
            setError('Biometric Geolocation Protocol Unavailable');
            showToast('GPS not available on this device', 'error');
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
                setError('GPS Uplink Request Denied. Please enable high-accuracy GPS.');
                showToast('GPS permission denied', 'error');
            }
        );
    };

    const handleRegister = async () => {
        if (!formData.latitude || !formData.longitude) {
            setError('Site coordinates required for geofencing initialization.');
            showToast('Complete GPS calibration first', 'warning');
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

            showToast('Site node deployed successfully', 'success');
            navigate('/owner');
        } catch (err) {
            console.error(err);
            setError('Protocol initialization failed. Database sync error.');
            showToast('Deployment failure', 'error');
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
                <header className="text-center space-y-2">
                    <div className="inline-flex items-center space-x-2 bg-primary/10 px-4 py-1.5 rounded-lg border border-primary/20 mb-4">
                        <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Initialization sequence</span>
                    </div>
                    <h1 className="text-4xl font-black italic  text-white">Site <span className="text-primary">Onboarding</span></h1>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Deploying Node: {step}/4</p>
                </header>

                {error && (
                    <div className="glass-card p-4 border-red-500/20 bg-red-500/5 flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-xs font-bold text-red-400 font-mono italic">"{error}"</p>
                    </div>
                )}

                <div className="glass-card p-8 bg-black/40 backdrop-blur-2xl ring-1 ring-white/10 shadow-neon overflow-hidden relative rounded-xl border-white/10">
                    <div className="animate-scan-line"></div>
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
                                <ShieldCheck className="text-primary w-6 h-6" />
                                <h3 className="text-lg font-black italic tracking-tight">Identity Protocol</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Domain Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter site name..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-sm font-bold placeholder:text-gray-700"
                                        value={formData.siteName}
                                        onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Administrator Email</label>
                                    <input
                                        type="email"
                                        readOnly
                                        className="w-full bg-white/3 border border-white/10 rounded-lg p-4 text-gray-600 text-sm font-bold cursor-not-allowed"
                                        value={formData.email}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={nextStep}
                                disabled={!formData.siteName}
                                className="w-full premium-btn py-5 rounded-lg font-black italic tracking-[0.2em] flex items-center justify-center space-x-2 mt-4"
                            >
                                <span>CONTINUE</span>
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
                                <MapPin className="text-primary w-6 h-6 text-red-500" />
                                <h3 className="text-lg font-black italic tracking-tight text-white">GPS Telemetry</h3>
                            </div>

                            <div className="bg-white/3 p-5 rounded-lg border border-white/5 space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Uplink Status</span>
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-lg ${formData.latitude ? "bg-secondary animate-pulse shadow-neon-success" : "bg-yellow-500 animate-pulse"}`}></div>
                                        <span className={`text-[10px] font-black uppercase ${formData.latitude ? "text-secondary" : "text-yellow-500"}`}>
                                            {formData.latitude ? "Connected" : "Acquiring..."}
                                        </span>
                                    </div>
                                </div>

                                {formData.latitude && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-black/40 rounded-lg border border-white/5 font-mono text-[10px] text-primary/80 font-bold italic">
                                        <div className="flex items-center space-x-2">
                                            <Activity className="w-3 h-3" />
                                            <span>LAT: {formData.latitude.toFixed(6)}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Activity className="w-3 h-3" />
                                            <span>LNG: {formData.longitude.toFixed(6)}</span>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={getLocation}
                                    className="w-full bg-primary/10 text-primary border border-primary/20 py-4 rounded-lg font-black text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all shadow-neon"
                                >
                                    {formData.latitude ? "REFRESH GEODYNAMICS" : "CAPTURE SPATIAL DATA"}
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Geo-Fence Radius (Meters)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-primary/50 text-sm font-bold text-white pl-12"
                                        value={formData.geoRadius}
                                        onChange={(e) => setFormData({ ...formData, geoRadius: parseInt(e.target.value) })}
                                    />
                                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-50" />
                                </div>
                            </div>

                            <div className="flex space-x-4 mt-6">
                                <button onClick={prevStep} className="flex-1 bg-white/5 py-4 rounded-lg font-black tracking-widest text-[10px] text-gray-400 hover:bg-white/10">BACK</button>
                                <button
                                    onClick={nextStep}
                                    disabled={!formData.latitude}
                                    className="flex-[2] premium-btn py-4 rounded-lg font-black italic tracking-widest text-[10px] text-white disabled:opacity-20"
                                >
                                    PROCEED
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
                                <Wifi className="text-blue-500 w-6 h-6" />
                                <h3 className="text-lg font-black italic tracking-tight">Signal Protocol</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Network SSID</label>
                                    <input
                                        type="text"
                                        placeholder="Office Wi-Fi name..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-primary/50 text-sm font-bold text-white transition-all placeholder:text-gray-700"
                                        value={formData.wifiSSID}
                                        onChange={(e) => setFormData({ ...formData, wifiSSID: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Access Token (Password)</label>
                                    <input
                                        type="password"
                                        placeholder="Security key..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-primary/50 text-base font-bold text-white transition-all placeholder:text-gray-700"
                                        value={formData.wifiPassword}
                                        onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-4 mt-6">
                                <button onClick={prevStep} className="flex-1 bg-white/5 py-4 rounded-lg font-black tracking-widest text-[10px] text-gray-400 hover:bg-white/10">BACK</button>
                                <button
                                    onClick={nextStep}
                                    disabled={!formData.wifiSSID}
                                    className="flex-[2] premium-btn py-4 rounded-lg font-black italic tracking-widest text-[10px] text-white disabled:opacity-20"
                                >
                                    PROCEED
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
                                <Clock className="text-secondary w-6 h-6" />
                                <h3 className="text-lg font-black italic tracking-tight">Temporal Rules</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Node Start</label>
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-primary/50 text-sm font-bold text-white"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Node Termination</label>
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-primary/50 text-sm font-bold text-white"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Grace Delta (Minutes)</label>
                                <input
                                    type="number"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-primary/50 text-sm font-bold text-white"
                                    value={formData.gracePeriod}
                                    onChange={(e) => setFormData({ ...formData, gracePeriod: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="flex space-x-4 mt-6">
                                <button onClick={prevStep} className="flex-1 bg-white/5 py-4 rounded-lg font-black tracking-widest text-[10px] text-gray-400">BACK</button>
                                <button
                                    onClick={handleRegister}
                                    disabled={loading}
                                    className="flex-[2] bg-gradient-to-tr from-secondary to-green-600 py-4 rounded-lg font-black italic tracking-widest text-[10px] text-black shadow-neon-success hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20"
                                >
                                    {loading ? "INITIALIZING..." : "DEPLOY SITE NODE"}
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

