import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [dialog, setDialog] = useState(null);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setDialog({
                ...options,
                resolve: (value) => {
                    setDialog(null);
                    resolve(value);
                }
            });
        });
    }, []);

    return (
        <UIContext.Provider value={{ showToast, confirm }}>
            {children}

            {/* Global Toast Container */}
            <div className="fixed top-6 right-6 z-[200] space-y-3 pointer-events-none">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
                ))}
            </div>

            {/* Global Dialog Container */}
            {dialog && <DialogComponent dialog={dialog} />}
        </UIContext.Provider>
    );
};

const ToastItem = ({ toast, onClose }) => {
    const icons = {
        success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
        error: <AlertCircle className="w-4 h-4 text-red-500" />,
        info: <Info className="w-4 h-4 text-blue-500" />,
        warning: <AlertTriangle className="w-4 h-4 text-amber-500" />
    };

    const colors = {
        success: 'border-emerald-500/20 bg-emerald-500/5',
        error: 'border-red-500/20 bg-red-500/5',
        info: 'border-blue-500/20 bg-blue-500/5',
        warning: 'border-amber-500/20 bg-amber-500/5'
    };

    return (
        <div className={`pointer-events-auto glass-card p-4 min-w-[300px] border flex items-center justify-between animate-in slide-in-from-right-10 duration-300 ${colors[toast.type]}`}>
            <div className="flex items-center space-x-3">
                {icons[toast.type]}
                <p className="text-[11px] font-black uppercase tracking-widest text-white/90">{toast.message}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
        </div>
    );
};

const DialogComponent = ({ dialog }) => {
    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 pb-20 sm:pb-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => dialog.resolve(false)}></div>
            <div className="glass-card w-full max-w-md p-8 relative z-10 space-y-6 border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">System <span className="text-primary italic">Protocol</span></h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{dialog.title || 'Administrative Confirmation'}</p>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                    <p className="text-sm font-medium text-gray-400 leading-relaxed text-center">
                        {dialog.message}
                    </p>
                </div>

                <div className="flex space-x-4">
                    <button
                        onClick={() => dialog.resolve(false)}
                        className="flex-1 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white/10 transition-all"
                    >
                        {dialog.cancelText || 'ABORT'}
                    </button>
                    <button
                        onClick={() => dialog.resolve(true)}
                        className={`flex-1 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg ${dialog.danger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                    >
                        {dialog.confirmText || 'PROCEED'}
                    </button>
                </div>
            </div>
        </div>
    );
};
