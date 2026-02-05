import { createContext, useContext, useState, useEffect } from "react";
import { auth, db, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "../services/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState({
        uid: null,
        name: "",
        email: "",
        role: null, // 'owner', 'manager', 'employee'
        photoURL: null,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Check Firestore for user record
                    const userDocRef = doc(db, "users", firebaseUser.uid);
                    const userSnap = await getDoc(userDocRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();

                        // Check if user is INACTIVE
                        if (userData.status === "inactive") {
                            await signOut(auth);
                            alert("Your account has been deactivated. Please contact your administrator.");
                            setUser({ uid: null, name: "", email: "", role: null, photoURL: null });
                            setLoading(false);
                            return;
                        }

                        setUser({
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName,
                            email: firebaseUser.email,
                            photoURL: firebaseUser.photoURL,
                            role: userData.role,
                            siteId: userData.siteId,
                            status: userData.status || 'active'
                        });
                    } else {
                        // Create user record if it doesn't exist (First time login)
                        const newUser = {
                            name: firebaseUser.displayName,
                            email: firebaseUser.email,
                            role: null,
                            siteId: null,
                            status: 'active',
                            createdAt: serverTimestamp(),
                        };
                        await setDoc(userDocRef, newUser);

                        setUser({
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName,
                            email: firebaseUser.email,
                            photoURL: firebaseUser.photoURL,
                            role: null,
                            siteId: null,
                            status: 'active'
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUser({
                        uid: firebaseUser.uid,
                        name: firebaseUser.displayName,
                        email: firebaseUser.email,
                        photoURL: firebaseUser.photoURL,
                        role: null,
                        // Assuming active loosely to prevent lockout on network error, 
                        // but ideally should block if critical.
                    });
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
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
