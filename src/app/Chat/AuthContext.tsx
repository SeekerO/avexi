"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase"; // Import db here
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    User,
} from "firebase/auth";
import { ref, set, onDisconnect } from "firebase/database"; // Import ref, set, onDisconnect
import { saveUserProfile } from "./saveUserProfile";

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Save user profile
                await saveUserProfile(currentUser);

                // Set user's online status
                const userStatusRef = ref(db, `presence/${currentUser.uid}`);
                set(userStatusRef, true); // Set online
                onDisconnect(userStatusRef).set(false); // Set offline on disconnect
                console.log(`User ${currentUser.uid} set to online. onDisconnect set.`);
            } else {
                // If user logs out, set their status offline explicitly
                if (user && user.uid) { // Check if user was previously logged in
                    const userStatusRef = ref(db, `presence/${user.uid}`);
                    set(userStatusRef, false);
                    console.log(`User ${user.uid} set to offline on logout.`);
                }
            }
        });
        return () => unsubscribe();
    }, [user]); // Add user to dependency array to ensure onDisconnect is set/cleared correctly on login/logout

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);