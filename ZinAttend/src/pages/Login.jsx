import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp, query, where, getDocs, collection, updateDoc } from 'firebase/firestore';
import { UserCircle, Briefcase, ArrowLeft, ShieldCheck, Fingerprint } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import Loader from '../components/UI/Loader';

const Login = ({ role }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { showToast } = useUI();

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
                        setError(`This email is registered as an ${existingData.role}. Please log in as ${existingData.role}.`);
                        showToast(`Role mismatch: registered as ${existingData.role}`, 'error');
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
                    setError(`This email is registered as an ${userData.role}. Please log in as ${userData.role}.`);
                    showToast(`Role mismatch: registered as ${userData.role}`, 'error');
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
                showToast(`Authenticated as ${userData.role}`, 'success');
                if (userData.role === 'owner') {
                    navigate(userData.siteId ? '/owner' : '/owner/register', { replace: true });
                } else {
                    navigate('/employee', { replace: true });
                }
            } else {
                if (role === 'employee') {
                    setError('Employee account not found. Please contact your site owner to register your email.');
                    showToast('Unregistered personnel', 'error');
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
                showToast('Admin profile created', 'success');
                navigate('/owner/register', { replace: true });
            }
        } catch (err) {
            console.error(err);
            setError('Login failed. Please try again.');
            showToast('Authentication failure', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isOwner = role === 'owner';

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {loading && <Loader message="Verifying_Credentials" />}
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-lg animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-lg animate-pulse-slow shadow-neon"></div>

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-10 space-y-2">
                    <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl mb-4">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Secure Access Gateway</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-white">
                        Zin<span className="text-primary">Attend</span>
                    </h1>
                </div>

                <div className="glass-card p-8 relative overflow-hidden group border-white/10 rounded-xl">
                    {/* Animated light streak */}
                    <div className="absolute -top-[100%] left-[-100%] w-[300%] h-[300%] bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-45 pointer-events-none group-hover:top-[-50%] group-hover:left-[-50%] transition-all duration-1000"></div>

                    <div className="relative z-10 space-y-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`p-4 rounded-xl bg-gradient-to-br ${isOwner ? 'from-primary/10 to-accent/10 border border-primary/20' : 'from-secondary/10 to-primary/10 border border-secondary/20'} animate-float shadow-neon`}>
                                {isOwner ? <Briefcase className="w-10 h-10 text-primary" /> : <Fingerprint className="w-10 h-10 text-secondary" />}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">
                                    {isOwner ? 'Owner Console' : 'Employee Hub'}
                                </h2>
                                <p className="text-gray-500 text-xs max-w-[250px] mx-auto font-medium">
                                    {isOwner
                                        ? 'Authorize and monitor site activity in real-time environment.'
                                        : 'Securely punch in and view your temporal attendance logs.'}
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl text-xs font-medium backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full flex items-center justify-center space-x-4 bg-white text-black py-4.5 rounded-xl font-black hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-2xl"
                            >
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                                <span>{loading ? 'VERIFYING...' : 'CONTINUE WITH GOOGLE'}</span>
                            </button>

                            <Link
                                to={isOwner ? '/login/employee' : '/login/owner'}
                                className="w-full flex items-center justify-center py-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 text-gray-400 hover:text-white transition-all text-[10px] font-black tracking-widest uppercase group"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                Switch to {isOwner ? 'Employee' : 'Owner'} Mode
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] space-y-2">
                    <p>© 2026 ZINATTEND SECURE SYSTEMS</p>
                    <p className="opacity-50">Advanced Biometric-GPS Validation Protocol v4.0</p>
                </div>
            </div>
        </div>
    );
};

export default Login;

