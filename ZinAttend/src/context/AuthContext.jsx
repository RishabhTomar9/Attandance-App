import { createContext, useContext, useState, useEffect } from "react";
import { auth, db, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "../services/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState({
        uid: null,
        name: "",
        email: "",
        role: null,
        photoURL: null,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, "users", firebaseUser.uid);
                    const userSnap = await getDoc(userDocRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        if (userData.status === "inactive") {
                            await signOut(auth);
                            alert("Account inactive.");
                            return;
                        }

                        // Backfill ID if missing (for existing users)
                        let currentId = userData.employeeId;
                        if (!currentId && userData.role) {
                            const prefix = userData.role === 'manager' ? 'MGR' : 'EMP';
                            currentId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
                            await updateDoc(userDocRef, { employeeId: currentId });
                        }

                        setUser({
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName,
                            email: firebaseUser.email,
                            photoURL: firebaseUser.photoURL,
                            role: userData.role,
                            siteId: userData.siteId,
                            status: userData.status || 'active',
                            employeeId: currentId
                        });
                    } else {
                        // NEW USER: Check for Invites (Pre-approval)
                        const email = firebaseUser.email;
                        const inviteRef = doc(db, "invites", email);
                        const inviteSnap = await getDoc(inviteRef);

                        let role = null;
                        let siteId = null;
                        let newId = null;

                        if (inviteSnap.exists()) {
                            // User was invited!
                            const inviteData = inviteSnap.data();
                            role = inviteData.role;
                            siteId = inviteData.siteId;

                            // Generate ID immediately if role is known
                            if (role) {
                                const prefix = role === 'manager' ? 'MGR' : 'EMP';
                                newId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
                            }

                            // Mark invite as used (optional, keeping it for record is fine)
                            await updateDoc(inviteRef, { status: 'accepted', claimedBy: firebaseUser.uid, claimedAt: serverTimestamp() });
                        }

                        const newUser = {
                            name: firebaseUser.displayName,
                            email: firebaseUser.email,
                            role: role, // Assigned from invite if present
                            siteId: siteId,
                            status: 'active',
                            employeeId: newId,
                            createdAt: serverTimestamp(),
                            faceRegistered: false
                        };
                        await setDoc(userDocRef, newUser);

                        setUser({
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName,
                            email: firebaseUser.email,
                            photoURL: firebaseUser.photoURL,
                            role: role,
                            siteId: siteId,
                            status: 'active',
                            employeeId: newId
                        });
                    }
                } catch (error) {
                    console.error("Auth Error:", error);
                }
            } else {
                setUser({ uid: null, name: "", email: "", role: null, photoURL: null });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const logout = async () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
