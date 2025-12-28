
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { api } from '../lib/axios';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: string; // Backend ID
    uid?: string; // Firebase UID
    name: string;
    email: string;
    role: string;
    clubId?: string;
    dbvClass?: string;
    unit?: { name: string };
    unitId?: string;
    specialties?: any[];
    points?: number;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkBackendToken = async (firebaseUser: any) => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Decode token to get basic info
                const decoded: any = jwtDecode(token);
                // decoded = { sub: userId, email, role, clubId, unitId, exp, iat }

                // Optional: We could verify if token is expired here

                setUser({
                    id: decoded.userId || decoded.sub, // Mapping backend ID
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || decoded.email,
                    name: firebaseUser.displayName || 'Usuário', // Or fetch from /users/me
                    role: decoded.role,
                    clubId: decoded.clubId,
                    unitId: decoded.unitId
                });
            } catch (e) {
                console.error("Invalid token:", e);
                localStorage.removeItem('token');
                // Fallback to minimal user (MEMBER)
                setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'Usuário',
                    role: 'MEMBER'
                } as User);
            }
        } else {
            // Fallback if no backend token but firebase exists (Legacy/Transition)
            // Try to fetch from Firestore as fallback
            try {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser({
                        id: firebaseUser.uid,
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: userData.name || firebaseUser.displayName || 'Usuário',
                        role: userData.role || 'MEMBER',
                        ...userData
                    } as User);
                } else {
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: firebaseUser.displayName || 'Usuário',
                        role: 'MEMBER'
                    } as User);
                }
            } catch (err) {
                setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || '',
                    role: 'MEMBER'
                } as User);
            }
        }
        setLoading(false);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await checkBackendToken(firebaseUser);
            } else {
                localStorage.removeItem('token'); // Clear token on logout
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        // 1. Firebase Login
        await signInWithEmailAndPassword(auth, email, password);

        // 2. Backend Login (Get Access Token for API & Roles)
        try {
            const res = await api.post('/auth/login', { email, password });
            const { access_token, user: backendUser } = res.data;
            if (access_token) {
                localStorage.setItem('token', access_token);
                // We don't need to manually setUser here because onAuthStateChanged 
                // will fire (or we can force update if needed, but the loop handles it)
                // However, onAuthStateChanged might fire BEFORE validation if we are not careful.
                // But since we await firebase login first, the listener triggers.
                // The listener checks localStorage. 
                // Race condition: Listener runs before we setItem?
                // Probably. So let's force a check or setUser here directly.

                setUser({
                    id: backendUser.id,
                    uid: auth.currentUser?.uid,
                    name: backendUser.name,
                    email: backendUser.email,
                    role: backendUser.role,
                    clubId: backendUser.clubId,
                    unitId: backendUser.unitId,
                    // Add other fields if returned by backend login
                });
            }
        } catch (error) {
            console.error("Backend login failed. Proceeding with limited access/fallback?", error);
            // If backend fails but firebase succeeds, we are in a weird state.
            // Best to logout to avoid confusion?
            await signOut(auth);
            throw new Error('Falha na autenticação com o servidor. Verifique se o usuário existe no sistema.');
        }
    };

    const logout = async () => {
        await signOut(auth);
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
