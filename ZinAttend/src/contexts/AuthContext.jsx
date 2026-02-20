import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore';

import Loader from '../components/UI/Loader';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUser = null;
        let unsubscribeSite = null;

        const authUnsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                setUser(authUser);

                const handleUserData = (data) => {
                    if (data.siteId) {
                        if (unsubscribeSite) unsubscribeSite();
                        unsubscribeSite = onSnapshot(doc(db, 'sites', data.siteId), (siteDoc) => {
                            if (siteDoc.exists()) {
                                setUserData({ ...data, ...siteDoc.data() });
                            } else {
                                setUserData(data);
                            }
                            setLoading(false);
                        });
                    } else {
                        setUserData(data);
                        setLoading(false);
                    }
                };

                // Try fetching by doc ID (Primary)
                unsubscribeUser = onSnapshot(doc(db, 'users', authUser.uid), (userDoc) => {
                    if (userDoc.exists()) {
                        handleUserData(userDoc.data());
                    } else {
                        // Try searching by 'uid' field (Secondary for employees)
                        const q = query(collection(db, 'users'), where('uid', '==', authUser.uid));
                        if (unsubscribeUser) unsubscribeUser(); // Unsubscribe first one if we're moving to query
                        unsubscribeUser = onSnapshot(q, (snapshot) => {
                            if (!snapshot.empty) {
                                handleUserData(snapshot.docs[0].data());
                            } else {
                                setUserData(null);
                                setLoading(false);
                            }
                        });
                    }
                });
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (unsubscribeUser) unsubscribeUser();
            if (unsubscribeSite) unsubscribeSite();
        };
    }, []);

    const value = {
        user,
        userData,
        loading,
        role: userData?.role || null,
        isOwner: userData?.role === 'owner',
        isEmployee: userData?.role === 'employee',
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <Loader /> : children}
        </AuthContext.Provider>
    );
};

