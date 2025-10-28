// AuthContext.tsx
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { auth, db } from "../../lib/firebase/firebase";
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    User,
} from "firebase/auth";
import { ref, set, onDisconnect, serverTimestamp, get } from "firebase/database";
import { saveUserProfile } from "./components/saveUserProfile";

// Extend User type to include custom properties like isAdmin and allowedPages
interface CustomUser extends User {
    isAdmin?: boolean;
    canChat?: boolean;
    allowedPages?: string[];
}


// Define the shape of the authentication context
interface AuthContextType {
    user: CustomUser | null;
    loginWithGoogle: () => Promise<void>;
    logout: () => void;
    uid?: string; // Ensure uid is always present
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<CustomUser | null>(null);

    // Use a ref to hold the current user state for reliable cleanup/logout
    const userRef = useRef(user);
    userRef.current = user;


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // 1. Save/Update Profile
                // This will use `update` for existing users, preserving existing permissions.
                await saveUserProfile(currentUser);

                // 2. Fetch the SAVED profile to get roles and permissions
                const userProfileRef = ref(db, `users/${currentUser.uid}`);
                const snapshot = await get(userProfileRef);

                let isAdmin = false;
                let canChat = false;
                // Initialize to undefined. Sidebar handles this by granting all pages 
                // for old users who have no configured permission field yet.
                let allowedPages: string[] | undefined = undefined;

                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    isAdmin = userData.isAdmin || false;
                    canChat = userData.canChat !== undefined ? userData.canChat : true;

                    // **CRITICAL FIX:** Read the allowedPages from the database snapshot
                    allowedPages = userData.allowedPages;
                }

                const userWithRoles: CustomUser = {
                    ...currentUser,
                    isAdmin,
                    canChat,
                    allowedPages, // This is now correctly set from the database
                };
                setUser(userWithRoles);

                // Presence/Online Status logic
                const userStatusRef = ref(db, `presence/${currentUser.uid}`);
                set(userStatusRef, true);
                onDisconnect(userStatusRef).set(serverTimestamp());
            } else {
                // Set last online timestamp using the ref to avoid stale state
                if (userRef.current && userRef.current.uid) {
                    const userStatusRef = ref(db, `presence/${userRef.current.uid}`);
                    set(userStatusRef, serverTimestamp());
                }
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    // Function to handle Google login
    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    // Function to handle user logout
    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to easily access the authentication context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};