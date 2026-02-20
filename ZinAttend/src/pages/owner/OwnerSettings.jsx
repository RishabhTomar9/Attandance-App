import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Settings, Wifi, Clock, FileText, Trash2, LogOut, ChevronRight, Lock, ShieldCheck, Zap, Activity, Database, Save, X, MapPin, RefreshCw, Scan, Copy, Check } from 'lucide-react';

const OwnerSettings = () => {
    const { userData } = useAuth();
    const { showToast, confirm } = useUI();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [tempValue, setTempValue] = useState('');
    const [copied, setCopied] = useState(false);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
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
            await updateDoc(doc(db, 'sites', userData.siteId), {
                [editingField]: editingField === 'geoRadius' ? Number(tempValue) : tempValue,
                updatedAt: serverTimestamp()
            });
            setEditingField(null);
            showToast('Site parameters synchronized', 'success');
        } catch (err) {
            console.error(err);
            showToast('Protocol update failed. Check uplink.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePurgeData = async () => {
        const confirmed = await confirm({
            title: 'Critical Purge Protocol',
            message: 'This will permanently erase all attendance telemetry from the site repository. This action is irreversible.',
            danger: true,
            confirmText: 'PURGE DATA',
            cancelText: 'ABORT'
        });

        if (!confirmed) return;

        setLoading(true);
        try {
            showToast('Admin override required for mass purge', 'warning');
        } finally {
            setLoading(false);
        }
    };

    const SettingsItem = ({ icon: Icon, title, subtitle, field, value, type = 'text', color = 'primary' }) => {
        const isEditing = editingField === field;
        const colorClasses = {
            primary: 'bg-primary/10 border-primary/20 text-primary',
            blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
            secondary: 'bg-secondary/10 border-secondary/20 text-secondary',
            red: 'bg-red-500/10 border-red-500/20 text-red-500'
        };

        return (
            <div className={`w-full p-6 transition-all duration-300 ${isEditing ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                        <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="font-black italic text-[9px] tracking-[0.2em] text-gray-500 uppercase">{title}</p>
                            {isEditing ? (
                                <input
                                    type={type}
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    autoFocus
                                    className="w-full bg-white/5 border-white/10 rounded-lg p-2 text-sm font-bold focus:ring-1 focus:ring-primary outline-none text-white transition-all"
                                />
                            ) : (
                                <p className="text-sm font-black tracking-tight text-white uppercase">{value || 'NOT_CONFIGURED'}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                        {isEditing ? (
                            <>
                                <button onClick={saveUpdate} disabled={loading} className="p-2.5 bg-primary/20 rounded-lg hover:bg-primary/40 text-primary transition-all active:scale-90">
                                    {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                                <button onClick={cancelEditing} className="p-2.5 bg-white/5 rounded-lg hover:bg-white/10 text-gray-500 transition-all active:scale-90">
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <button onClick={() => startEditing(field, value)} className="p-2.5 bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 transition-all active:scale-90">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-10 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
            <header className="space-y-2">
                <div className="inline-flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                    <Settings className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Environment Terminal</span>
                </div>
                <h1 className="text-4xl font-black italic tracking-tighter text-white">Kernel <span className="text-primary italic">Config</span></h1>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Modify site operational parameters</p>
            </header>

            <section className="space-y-6">
                <div className="flex items-center space-x-3 px-1">
                    <Activity className="w-4 h-4 text-primary" />
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Gate Rules</h3>
                </div>
                <div className="glass-card divide-y divide-white/5 overflow-hidden border-white/10 bg-black/40 shadow-neon-soft rounded-xl">
                    <SettingsItem
                        icon={ShieldCheck}
                        title="Authorized Site Name"
                        field="siteName"
                        value={userData?.siteName}
                        color="primary"
                    />
                    <SettingsItem
                        icon={Wifi}
                        title="Network Tether (SSID)"
                        field="wifiSSID"
                        value={userData?.wifiSSID}
                        color="blue"
                    />
                    <SettingsItem
                        icon={Clock}
                        title="Access Window Start"
                        field="startTime"
                        value={userData?.startTime}
                        type="time"
                        color="secondary"
                    />
                    <SettingsItem
                        icon={Clock}
                        title="Access Window End"
                        field="endTime"
                        value={userData?.endTime}
                        type="time"
                        color="secondary"
                    />

                    <div className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors relative group">
                        <div className="flex items-center space-x-4">
                            <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                <MapPin className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="text-left space-y-0.5">
                                <p className="font-black italic text-[9px] tracking-[0.2em] text-gray-500 uppercase">Geographic Origin</p>
                                <p className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-widest">
                                    {userData?.latitude?.toFixed(6) || 'N/A'}, {userData?.longitude?.toFixed(6) || 'N/A'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                if (!navigator.geolocation) return;
                                const confirmed = await confirm({
                                    title: 'Recalibrate GPS Origin',
                                    message: 'Synchronizing site coordinates with your current physical location. This will update the security gate position.',
                                    confirmText: 'RECALIBRATE',
                                    cancelText: 'ABORT'
                                });

                                if (!confirmed) return;
                                setLoading(true);
                                navigator.geolocation.getCurrentPosition(async (pos) => {
                                    try {
                                        await updateDoc(doc(db, 'sites', userData.siteId), {
                                            latitude: pos.coords.latitude,
                                            longitude: pos.coords.longitude,
                                            updatedAt: serverTimestamp()
                                        });
                                        showToast('Gate coordinates recalibrated', 'success');
                                    } catch (err) {
                                        showToast('Calibration failed', 'error');
                                    } finally {
                                        setLoading(false);
                                    }
                                });
                            }}
                            className="p-2.5 bg-white/5 rounded-lg hover:bg-primary/20 hover:text-primary text-gray-500 transition-all active:scale-90"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <SettingsItem
                        icon={Zap}
                        title="Geofence Threshold (M)"
                        field="geoRadius"
                        value={userData?.geoRadius ? `${userData.geoRadius} Meters` : '30 Meters'}
                        type="number"
                        color="primary"
                    />
                </div>
            </section>

            {/* Scanner Kiosk Section */}
            <section className="space-y-6">
                <div className="flex items-center space-x-3 px-1">
                    <Scan className="w-4 h-4 text-primary" />
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Scanner Kiosk</h3>
                </div>
                <div className="glass-card divide-y divide-white/5 overflow-hidden border-white/10 bg-black/40 shadow-neon-soft rounded-xl">
                    <SettingsItem
                        icon={Lock}
                        title="Scanner Password"
                        field="scannerPassword"
                        value={userData?.scannerPassword ? '••••••••' : ''}
                        color="red"
                    />

                    <div className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center space-x-4">
                            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                <ShieldCheck className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="text-left space-y-0.5">
                                <p className="font-black italic text-[9px] tracking-[0.2em] text-gray-500 uppercase">Site ID</p>
                                <p className="text-sm font-black tracking-tight text-white uppercase font-mono">{userData?.siteId || 'N/A'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(userData?.siteId || '');
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="p-2.5 bg-white/5 rounded-lg hover:bg-blue-500/20 hover:text-blue-500 text-gray-500 transition-all active:scale-90"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="w-full p-6 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center space-x-4">
                            <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                                <Scan className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left space-y-1 flex-1">
                                <p className="font-black italic text-[9px] tracking-[0.2em] text-gray-500 uppercase">Kiosk Login URL</p>
                                <p className="text-[10px] font-mono font-bold text-primary break-all">{window.location.origin}/scanner-login</p>
                                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-1">Open this URL on the scanner device</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center space-x-3 px-1">
                    <Database className="w-4 h-4 text-primary" />
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Data Management</h3>
                </div>
                <div className="glass-card divide-y divide-white/5 overflow-hidden border-white/10 bg-black/40 shadow-neon-soft rounded-xl">
                    <button className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                        <div className="flex items-center space-x-4">
                            <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                                <FileText className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div className="text-left space-y-0.5">
                                <p className="font-black italic text-[9px] tracking-[0.2em] text-gray-500 uppercase">Attendance Streams</p>
                                <p className="text-sm font-black tracking-tight text-white uppercase group-hover:text-yellow-500 transition-colors">Export Daily Logs</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-700 group-hover:translate-x-1 transition-all" />
                    </button>
                    <button
                        onClick={handlePurgeData}
                        className="w-full p-6 flex items-center justify-between hover:bg-red-500/10 transition-colors group"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 group-hover:bg-red-500 transition-all duration-300">
                                <Trash2 className="w-5 h-5 text-red-500 group-hover:text-black transition-colors" />
                            </div>
                            <div className="text-left space-y-0.5">
                                <p className="font-black italic text-[9px] tracking-[0.2em] text-red-500/40 uppercase">System Override</p>
                                <p className="text-sm font-black tracking-tight text-red-500 uppercase group-hover:translate-x-1 transition-all">Format All Telemetry</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-red-900 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            </section>

            <div className="pt-6 space-y-4">
                <button
                    onClick={handleLogout}
                    className="w-full p-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center space-x-4 text-red-500 group hover:bg-red-500/20 hover:border-red-500/40 transition-all shadow-lg shadow-red-500/10"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-black italic text-sm tracking-[0.2em] uppercase">Terminate Admin Session</span>
                </button>

                <div className="flex flex-col items-center space-y-2 opacity-30 mt-8">
                    <ShieldCheck className="w-6 h-6 text-gray-500" />
                    <div className="text-center">
                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-[0.4em]">ZinAttend Matrix Protcol</p>
                        <p className="text-[7px] text-gray-600 font-bold uppercase mt-1 tracking-widest leading-none">Secured via temporal encryption gate</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerSettings;


