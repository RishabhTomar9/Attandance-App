import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBVzwvphwGvy7CmcrbIhZa0BITLnBGN0XI",
    authDomain: "attandance-by-zintrix.firebaseapp.com",
    projectId: "attandance-by-zintrix",
    storageBucket: "attandance-by-zintrix.firebasestorage.app",
    messagingSenderId: "709381346521",
    appId: "1:709381346521:web:4e8152a9ad0a24d265dac8",
    measurementId: "G-38YB6JN92Y"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut };

export default app;
