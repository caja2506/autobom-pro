import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const RoleContext = createContext(null);

export function useRole() {
    const context = useContext(RoleContext);
    if (!context) throw new Error('useRole must be used within a RoleProvider');
    return context;
}

export function RoleProvider({ children }) {
    const { user } = useAuth();
    const [role, setRole] = useState(null);
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setRole(null);
            setRoleLoading(false);
            return;
        }

        setRoleLoading(true);
        const userRoleRef = doc(db, 'users_roles', user.uid);

        const unsubscribe = onSnapshot(userRoleRef, async (snap) => {
            if (snap.exists()) {
                setRole(snap.data().role || 'viewer');
            } else {
                // First-time user: auto-create as 'admin' (first user is admin)
                // For subsequent users, you can change default to 'viewer'
                const isFirstUser = true; // Change this logic as needed
                const defaultRole = isFirstUser ? 'admin' : 'viewer';
                await setDoc(userRoleRef, {
                    email: user.email,
                    displayName: user.displayName || '',
                    role: defaultRole,
                    createdAt: new Date().toISOString(),
                });
                setRole(defaultRole);
            }
            setRoleLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const isAdmin = role === 'admin';
    const isEditor = role === 'editor';
    const isViewer = role === 'viewer';
    const canEdit = role === 'admin' || role === 'editor';
    const canDelete = role === 'admin';

    const value = {
        role,
        roleLoading,
        isAdmin,
        isEditor,
        isViewer,
        canEdit,
        canDelete,
    };

    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
