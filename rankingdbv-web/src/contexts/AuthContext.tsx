
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { api } from '../lib/axios';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: string; // Backend ID
    uid?: string; // Firebase UID
    name: string;
    email: string;
    role: string;
    secondaryRoles?: string[];
    clubId?: string;
    dbvClass?: string;
    unit?: { name: string };
    unitId?: string;
    specialties?: any[];
    points?: number;
    mustChangePassword?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
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

                // Fetch full data from backend to get the real Name (source of truth)
                let backendName = firebaseUser.displayName || 'Usuário';
                let secondaryRoles: string[] = [];

                try {
                    const res = await api.get(`/users/${decoded.userId || decoded.sub}`);
                    if (res.data) {
                        if (res.data.name) backendName = res.data.name;
                        if (res.data.secondaryRoles) secondaryRoles = res.data.secondaryRoles;
                    }
                } catch (apiErr) {
                    console.warn("Could not fetch user profile from API, using fallback name:", apiErr);
                }

                setUser({
                    id: decoded.userId || decoded.sub,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || decoded.email,
                    name: backendName,
                    role: decoded.role,
                    secondaryRoles: secondaryRoles,
                    clubId: decoded.clubId,
                    unitId: decoded.unitId,
                    mustChangePassword: decoded.mustChangePassword
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
        console.log('[Login] Starting login flow for:', email);

        // 1. Firebase Login
        try {
            console.log('[Login] 1. Executing Firebase signInWithEmailAndPassword...');
            await signInWithEmailAndPassword(auth, email, password);
            console.log('[Login] 1. Firebase Login Success');
        } catch (firebaseErr) {
            console.error('[Login] 1. Firebase Login Failed:', firebaseErr);
            throw firebaseErr;
        }

        // 2. Backend Login (Get Access Token for API & Roles)
        try {
            console.log('[Login] 2. Requesting Backend Token...');
            const res = await api.post('/auth/login', { email, password });
            console.log('[Login] 2. Backend Response Received');
            const { access_token, user: backendUser } = res.data;

            if (access_token) {
                localStorage.setItem('token', access_token);
                console.log('[Login] 3. Token stored');

                // SYNC FIRESTORE: Background task, non-blocking
                const userRef = doc(db, 'users', auth.currentUser?.uid || backendUser.id);
                setDoc(userRef, {
                    role: backendUser.role,
                    clubId: backendUser.clubId || null,
                    unitId: backendUser.unitId || null,
                    email: backendUser.email
                }, { merge: true })
                    .then(() => console.log('[Login] 4. Firestore Sync Success (Background)'))
                    .catch(e => console.warn('[Login] 4. Firestore Sync Failed (Non-critical):', e));

                console.log('[Login] 5. Setting User State...');
                setUser({
                    id: backendUser.id,
                    uid: auth.currentUser?.uid,
                    name: backendUser.name,
                    email: backendUser.email,
                    role: backendUser.role,
                    secondaryRoles: backendUser.secondaryRoles || [],
                    clubId: backendUser.clubId,
                    unitId: backendUser.unitId,
                    mustChangePassword: backendUser.mustChangePassword
                });
                console.log('[Login] 6. Login Complete');
            }
        } catch (error: any) {
            console.error("Backend login failed.", error);

            // Check if user exists in Firebase but NOT in Backend (Limbo state)
            const isUserNotFound = error.response?.status === 401 || error.response?.status === 404;

            if (isUserNotFound && auth.currentUser) {
                // User is in Firebase but not PostgreSQL
                // We DON'T sign out yet, we give them a chance to "Complete" registration
                throw new Error('CONTA_INCOMPLETA');
            }

            await signOut(auth);
            throw new Error(error.response?.data?.message || 'Falha na autenticação com o servidor. Verifique seu login.');
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
            isAuthenticated: !!user,
            setUser
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
