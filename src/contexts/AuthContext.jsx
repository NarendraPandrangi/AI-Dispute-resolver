import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeFirestore = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                // 1. Initial State from Auth
                setCurrentUser(user);

                // 2. Listen to Firestore 'users' collection for extended profile (avatar)
                // This bypasses Storage issues by reading Base64 from Firestore
                unsubscribeFirestore = onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
                    const firestoreData = docSnapshot.data();
                    console.log("AuthContext: Firestore update received", firestoreData);

                    setCurrentUser(prevUser => {
                        // Use prevUser to ensure we keep recent manual updates (like displayName changes)
                        // If prevUser is null (rare race condition), fallback to 'user' from closure
                        const baseUser = prevUser || user;

                        // Create a shallow copy
                        const updatedUser = { ...baseUser };

                        if (firestoreData?.photoBase64) {
                            updatedUser.photoURL = firestoreData.photoBase64;
                        }
                        return updatedUser;
                    });
                }, (error) => {
                    console.error("Error listening to user profile:", error);
                });
            } else {
                setCurrentUser(null);
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null; // Clear the reference
                }
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
            }
        };
    }, []);

    const updateUserProfile = async (data) => {
        if (auth.currentUser) {
            // Update Auth Profile (Name, etc)
            await updateProfile(auth.currentUser, data);

            // Force update local state immediately
            // This will be merged with any existing Firestore data in currentUser
            setCurrentUser(prev => ({
                ...prev,
                ...data
            }));
        }
    };

    const value = {
        currentUser,
        loading,
        updateUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
