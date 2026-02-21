import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Settings, Wifi, Clock, FileText, Trash2, LogOut, ChevronRight, Lock, ShieldCheck, Zap, Activity, Database, Save, X, MapPin, RefreshCw, Scan, Copy, Check, Edit2, ShieldAlert, Key } from 'lucide-react';
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


const OwnerSettings = () => {
    const { userData } = useAuth();
    const { showToast, confirm } = useUI();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [tempValue, setTempValue] = useState('');
    const [copied, setCopied] = useState(false);

    const currentSettings = {
        siteName: userData?.siteName || '',
        wifiSSID: userData?.wifiSSID || '',
        wifiPassword: userData?.wifiPassword || '',
        startTime: userData?.startTime || '09:00',
        endTime: userData?.endTime || '18:00',
        halfDayHours: userData?.halfDayHours || '4',
        scannerPassword: userData?.scannerPassword || '',
        lat: userData?.latitude || 0,
        lng: userData?.longitude || 0,
        radius: 100 // Locked to 100m per request
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const formatTime12h = (timeStr) => {
        if (!timeStr) return 'Not set';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    };

    const startEditing = (field, value) => {
        setEditingField(field);
        setTempValue(value || '');
    };

    const cancelEditing = () => {
        setEditingField(null);
        setTempValue('');
    };

    const saveUpdate = async () => {
        if (!userData?.siteId || !editingField) return;
        setLoading(true);
        try {
            const updateData = {
                [editingField]: editingField === 'halfDayHours' ? Number(tempValue) : tempValue,
                geoRadius: 100, // Always ensure it's 100m
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(db, 'sites', userData.siteId), updateData);
            setEditingField(null);
            showToast('Settings saved successfully', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to save settings.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePurgeData = async () => {
        const confirmed = await confirm({
            title: 'Reset All Data?',
            message: 'Are you sure? This will delete all attendance logs.',
            danger: true,
            confirmText: 'RESET ALL',
            cancelText: 'CANCEL'
        });

        if (!confirmed) return;
        showToast('Please contact support for bulk deletion', 'warning');
    };

    const SettingsItem = ({ icon: Icon, title, label, field, value, type = 'text', color = 'primary', locked = false }) => {
        const isEditing = editingField === field;
        const colorClasses = {
            primary: 'bg-primary/10 border-primary/20 text-primary',
            blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
            secondary: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
            red: 'bg-red-500/10 border-red-500/20 text-red-500',
            amber: 'bg-amber-500/10 border-amber-500/20 text-amber-500'
        };

        return (
            <div className={`w-full p-6 transition-all duration-300 ${isEditing ? 'bg-white/10' : 'hover:bg-white/[0.02]'}`}>
                <div className="flex items-start justify-between space-x-5">
                    <div className={`p-4 rounded-lg border ${colorClasses[color] || colorClasses.primary} shadow-lg`}>
                        <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0 py-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">{title}</p>

                        {isEditing ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                                <input
                                    type={type}
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    autoFocus
                                    className="w-full bg-slate-900 border-2 border-primary/30 rounded-lg p-5 text-lg font-black text-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-inner"
                                    placeholder={`Enter ${title.toLowerCase()}...`}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={saveUpdate} disabled={loading} className="bg-primary text-black text-xs font-black uppercase py-4 rounded-lg active:scale-95 transition-all shadow-lg hover:bg-blue-400">
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                                    </button>
                                    <button onClick={cancelEditing} className="bg-white/5 text-gray-400 text-xs font-black uppercase py-4 rounded-lg border border-white/10 active:scale-95 transition-all hover:bg-white/10">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h4 className="text-xl font-black text-white uppercase tracking-tight truncate mb-1">
                                    {field === 'scannerPassword' || field === 'wifiPassword' ? (value ? '••••••••' : 'Not set') :
                                        (field === 'startTime' || field === 'endTime') ? formatTime12h(value) : (value || 'Not set')}
                                </h4>
                                <p className="text-sm text-gray-500 font-bold leading-tight tracking-wide">{label}</p>
                            </div>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="shrink-0 flex items-center h-14">
                            {locked ? (
                                <div className="p-3 bg-white/[0.03] rounded-lg">
                                    <Lock className="w-5 h-5 text-gray-800" />
                                </div>
                            ) : (
                                <button
                                    onClick={() => startEditing(field, value)}
                                    className="p-4 bg-white/5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all shadow-md group"
                                >
                                    <Edit2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-10 pt-4 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="px-2 space-y-3">
                <div className="inline-flex items-center space-x-3 text-primary bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                    <Settings className="w-5 h-5 animate-spin-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] leading-none">Setup</span>
                </div>
                <h1 className="text-4xl font-black text-white italic">Office <span className="text-primary not-italic">Setup</span></h1>
                <p className="text-gray-500 text-sm font-bold tracking-wide">Office setup and safety rules</p>
            </header>

            {/* Attendance Config */}
            <div className="space-y-4">
                <h3 className="px-2 text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center space-x-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <span>Rules</span>
                </h3>
                <div className="bg-slate-950/60 backdrop-blur-3xl border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5 shadow-2xl">
                    <SettingsItem
                        icon={ShieldCheck}
                        title="Office Name"
                        label="Name shown to employees"
                        field="siteName"
                        value={currentSettings.siteName}
                        color="primary"
                    />
                    <SettingsItem
                        icon={Wifi}
                        title="WiFi Name"
                        label="WiFi name for attendance"
                        field="wifiSSID"
                        value={currentSettings.wifiSSID}
                        color="blue"
                    />
                    <SettingsItem
                        icon={Key}
                        title="WiFi Password"
                        label="Office WiFi password"
                        field="wifiPassword"
                        value={currentSettings.wifiPassword}
                        color="blue"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                        <SettingsItem
                            icon={Clock}
                            title="Start Time"
                            label="When shift begins"
                            field="startTime"
                            value={currentSettings.startTime}
                            type="time"
                            color="secondary"
                        />
                        <SettingsItem
                            icon={Clock}
                            title="End Time"
                            label="When shift ends"
                            field="endTime"
                            value={currentSettings.endTime}
                            type="time"
                            color="secondary"
                        />
                    </div>
                    <SettingsItem
                        icon={Zap}
                        title="Full Day Hours"
                        label="Hours needed for full day"
                        field="halfDayHours"
                        value={currentSettings.halfDayHours ? `${currentSettings.halfDayHours} Hours` : '4 Hours'}
                        type="number"
                        color="amber"
                    />
                </div>
            </div>

            {/* Location Config */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <span>Office Location</span>
                    </h3>
                    <div className="bg-red-500/10 px-3 py-1.5 rounded-lg flex items-center space-x-2 border border-red-500/20 shadow-lg">
                        <Lock className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] font-black text-red-500 tracking-wider">LOCKED</span>
                    </div>
                </div>

                <div className="bg-slate-950/60 backdrop-blur-3xl border border-white/10 rounded-lg overflow-hidden shadow-2xl">
                    <div className="h-72 w-full relative z-10 border-b border-white/5">
                        {currentSettings.lat !== 0 && (
                            <MapContainer
                                center={[currentSettings.lat, currentSettings.lng]}
                                zoom={16}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={true}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Circle
                                    center={[currentSettings.lat, currentSettings.lng]}
                                    radius={100}
                                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 2 }}
                                />
                                <Marker position={[currentSettings.lat, currentSettings.lng]} />
                                <ChangeView center={[currentSettings.lat, currentSettings.lng]} />
                            </MapContainer>
                        )}
                        <div className="absolute top-4 right-4 z-20 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 flex items-center space-x-2">
                            <Zap className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">100m Geofence</span>
                        </div>
                    </div>

                    <div className="divide-y divide-white/5">
                        <div className="p-6 flex items-center space-x-5">
                            <div className="p-4 bg-rose-500/10 rounded-lg border border-rose-500/20">
                                <MapPin className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">COORDINATES</p>
                                <p className="text-lg font-black font-mono text-white italic">{currentSettings.lat.toFixed(6)}, {currentSettings.lng.toFixed(6)}</p>
                            </div>
                        </div>

                        <div className="p-6 bg-red-500/5 flex items-start space-x-4">
                            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-1" />
                            <div className="space-y-1">
                                <p className="text-sm font-black text-white italic uppercase tracking-tight">Location Locked</p>
                                <p className="text-xs text-gray-500 font-bold leading-relaxed">
                                    Location settings are locked. Contact Support to change your office coordinates.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanner Config */}
            <div className="space-y-4">
                <h3 className="px-2 text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center space-x-3">
                    <Scan className="w-4 h-4 text-primary" />
                    <span>Scanner Login</span>
                </h3>
                <div className="bg-slate-950/60 backdrop-blur-3xl border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5 shadow-2xl">
                    <SettingsItem
                        icon={Lock}
                        title="Scanner Password"
                        label="Password for the office scanner"
                        field="scannerPassword"
                        value={currentSettings.scannerPassword}
                        color="red"
                    />
                    <div className="p-8 flex items-center justify-between">
                        <div className="flex items-center space-x-5">
                            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 text-primary shadow-lg">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Site ID</p>
                                <p className="text-xl font-black text-white font-mono italic tracking-tighter">{userData?.siteId || 'N/A'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(userData?.siteId || '');
                                setCopied(true);
                                showToast('Site ID Copied', 'success');
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="p-5 bg-white/5 rounded-lg border border-white/10 text-gray-400 hover:bg-primary/10 hover:text-primary active:scale-90 transition-all shadow-md group"
                        >
                            {copied ? <Check className="w-6 h-6 text-emerald-500" /> : <Copy className="w-6 h-6 group-hover:scale-110" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Actions */}
            <div className="pt-8 space-y-4">
                <button onClick={handlePurgeData} className="w-full p-6 bg-red-500/5 border border-red-500/10 rounded-lg flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-red-500/10 shadow-xl">
                    <div className="flex items-center space-x-5">
                        <div className="p-4 rounded-lg bg-red-500/10 text-red-500 shadow-md">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-black text-red-500/50 uppercase tracking-widest mb-1">Reset Space</p>
                            <p className="text-lg font-black text-red-500 uppercase italic">Clear All Logs</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-900 group-hover:translate-x-2 transition-transform" />
                </button>

                <button onClick={handleLogout} className="w-full p-6 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between active:scale-[0.98] transition-all hover:bg-white/5 shadow-xl">
                    <div className="flex items-center space-x-5">
                        <div className="p-4 rounded-lg bg-white/5 text-gray-400 shadow-md">
                            <LogOut className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Profile</p>
                            <p className="text-lg font-black text-white uppercase italic">Logout</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-800 group-hover:translate-x-2 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default OwnerSettings;


