import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp, query, where, getDocs, collection, updateDoc } from 'firebase/firestore';
import { UserCircle, Briefcase, ArrowLeft, ShieldCheck, Fingerprint, ChevronLeft, Lock, Loader2, Activity } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import Loader from '../components/UI/Loader';
import BrandingFooter from '../components/UI/BrandingFooter';


/**
 * Login - Simplified and User-Friendly
 */
const Login = ({ role }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useUI();

    useEffect(() => {
        setIsLoaded(true);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            let userDoc = await getDoc(doc(db, 'users', user.uid));
            let userData = userDoc.exists() ? userDoc.data() : null;
            let targetDocId = userDoc.id;

            if (!userData) {
                const qUid = query(collection(db, 'users'), where('uid', '==', user.uid));
                const uidSnapshot = await getDocs(qUid);
                if (!uidSnapshot.empty) {
                    targetDocId = uidSnapshot.docs[0].id;
                    userData = uidSnapshot.docs[0].data();
                }
            }

            if (!userData) {
                const qEmail = query(collection(db, 'users'), where('email', '==', user.email));
                const emailSnapshot = await getDocs(qEmail);

                if (!emailSnapshot.empty) {
                    const existingDoc = emailSnapshot.docs[0];
                    const existingData = existingDoc.data();

                    if (existingData.role !== role) {
                        setError(`Email mismatch: registered as ${existingData.role}.`);
                        showToast(`Switch to ${existingData.role} login`, 'error');
                        setLoading(false);
                        return;
                    }

                    targetDocId = existingDoc.id;
                    await updateDoc(doc(db, 'users', targetDocId), {
                        uid: user.uid,
                        name: user.displayName,
                        photoURL: user.photoURL,
                        isLinked: true,
                        lastLogin: serverTimestamp()
                    });

                    userData = { ...existingData, uid: user.uid, isLinked: true };
                }
            } else {
                if (userData.role !== role) {
                    setError(`Email mismatch: registered as ${userData.role}.`);
                    setLoading(false);
                    return;
                }

                await updateDoc(doc(db, 'users', targetDocId), {
                    name: user.displayName,
                    photoURL: user.photoURL,
                    lastLogin: serverTimestamp()
                });
            }

            if (userData) {
                if (userData.role === 'owner') {
                    navigate(userData.siteId ? '/owner' : '/owner/register', { replace: true });
                } else {
                    navigate('/employee', { replace: true });
                }
            } else {
                if (role === 'employee') {
                    setError('Account not found. Contact site owner.');
                    setLoading(false);
                    return;
                }

                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    role: 'owner',
                    createdAt: serverTimestamp(),
                });
                navigate('/owner/register', { replace: true });
            }
        } catch (err) {
            console.error(err);
            setError('Auth failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const isOwner = role === 'owner';
    const accentColor = isOwner ? 'var(--color-primary)' : 'var(--color-secondary)';

    return (
        <div className="fixed inset-0 bg-[#030303] flex flex-col items-center justify-center p-5 sm:p-8 select-none overflow-hidden font-sans">
            {loading && <Loader message="Setting up your session..." />}


            <div className={`w-full max-w-md z-10 flex flex-col h-full max-h-[800px] transition-all duration-700 ease-out transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>

                {/* Back Navigation */}
                <div className="flex-none pt-4 pb-8">
                    <button
                        onClick={() => navigate('/login')}
                        className="group flex items-center space-x-3 text-gray-500 hover:text-white transition-all transform active:scale-90 tap-highlight-transparent"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-active:bg-primary/20 transition-all">
                            <ChevronLeft className="w-5 h-5 group-active:-translate-x-1 transition-transform" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Go Back</span>
                    </button>
                </div>

                {/* Login Content */}
                <div className="flex-1 flex flex-col justify-center space-y-8 sm:space-y-10">
                    <div className="text-center space-y-4">
                        <div className="relative group">
                            <div className="relative w-28 h-28 mx-auto">
                                <img
                                    src="/icon-512.png"
                                    alt="ZinAttend Logo"
                                    className="w-full h-full object-contain p-2 rounded-3xl"
                                />
                                <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/40 animate-scan-y shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                            </div>
                        </div>
                        <h1 className="text-5xl font-black  text-white">
                            Zin<span className="italic" style={{ color: accentColor }}>Attend</span>
                        </h1>
                    </div>

                    <div className="relative group">
                        <div className="glass-card p-8 sm:p-10 relative overflow-hidden rounded-[2.5rem] border-white/10 bg-black/40 backdrop-blur-3xl">
                            <div className="relative z-10 space-y-10">
                                {/* Role Identity */}
                                <div className="flex flex-col items-center text-center space-y-6">
                                    <div className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl animate-float group-hover:scale-105 transition-transform duration-500">
                                        {isOwner ? <Briefcase className="w-10 h-10" style={{ color: accentColor }} /> : <Fingerprint className="w-10 h-10" style={{ color: accentColor }} />}
                                    </div>

                                    <div className="space-y-2.5">
                                        <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">
                                            {isOwner ? 'Owner Login' : 'Employee Login'}
                                        </h2>
                                        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[240px] mx-auto">
                                            {isOwner ? 'Access your dashboard' : 'Sign in to mark attendance'}
                                        </p>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center animate-shake">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <button
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                        className="w-full relative py-5 rounded-2xl bg-white text-black font-black text-xs tracking-[0.15em] uppercase flex items-center justify-center space-x-4 active:scale-[0.97] transition-all disabled:opacity-50 shadow-2xl"
                                    >
                                        {!loading && <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 translate-y-[-1px]" />}
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Sign in with Google</span>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <BrandingFooter className="py-8" />

            </div>

            <style>{`
                .tap-highlight-transparent { -webkit-tap-highlight-color: transparent; }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.3s ease-in-out; }
                @keyframes scan-y {
                    0% { transform: translateY(0); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(112px); opacity: 0; }
                }
                .animate-scan-y { animation: scan-y 3s ease-in-out infinite; }
                .tap-highlight-transparent { -webkit-tap-highlight-color: transparent; }
            `}</style>
        </div>
    );
};

export default Login;
