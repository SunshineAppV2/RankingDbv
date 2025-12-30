import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, ArrowRight, Home, Users, MapPin, Globe, Award, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface Club {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

// Comprehensive DSA Hierarchy Data
const HIERARCHY_DATA: Record<string, string[]> = {
    'União Central Brasileira (UCB)': ['Paulista Central', 'Paulista Do Vale', 'Paulista Leste', 'Paulista Oeste', 'Paulista Sudeste', 'Paulista Sudoeste', 'Paulista Sul', 'Paulistana'],
    'União Centro Oeste Brasileira (UCOB)': ['Brasil Central', 'Leste Mato-Grossense', 'Oeste Mato-Grossense', 'Planalto Central', 'Sul Mato-Grossense', 'Tocantins'],
    'União Leste Brasileira (ULB)': ['Bahia', 'Bahia Central', 'Bahia Norte', 'Bahia Sul', 'Bahia Extremo Sul', 'Bahia Sudoeste', 'Sergipe'],
    'União Nordeste Brasileira (UNEB)': ['Cearense', 'Pernambucana', 'Pernambucana Central', 'Alagoas', 'Piauiense', 'Rio Grande do Norte-Paraíba'],
    'União Noroeste Brasileira (UNOB)': ['Amazonas Roraima', 'Central Amazonas', 'Norte de Rondônia e Acre', 'Sul de Rondônia', 'Leste Amazonas'],
    'União Norte Brasileira (UNB)': ['Maranhense', 'Norte Do Pará', 'Sul Do Pará', 'Sul Maranhense', 'Nordeste Maranhense', 'Oeste Do Pará', 'Pará Amapá'],
    'União Sudeste Brasileira (USEB)': ['Espírito Santense', 'Mineira Central', 'Mineira Leste', 'Mineira Sul', 'Rio de Janeiro', 'Rio Fluminense', 'Rio Sul', 'Sul Espírito Santense', 'Mineira Norte', 'Mineira Oeste'],
    'União Sul Brasileira (USB)': ['Central do Rio Grande do Sul', 'Central Paranaense', 'Norte Catarinense', 'Norte do Rio Grande do Sul', 'Norte Paranaense', 'Oeste Paranaense', 'Sul Catarinense', 'Sul do Rio Grande do Sul', 'Sul Paranaense'],
    'União Argentina (UA)': ['Argentina Central', 'Argentina del Norte', 'Argentina del Sur', 'Bonaerense', 'Argentina del Centro Oeste', 'Argentina del Noroeste', 'Bonaerense del Norte'],
    'União Boliviana (UB)': ['Boliviana Central', 'Boliviana Occidental Norte', 'Boliviana Occidental Sur', 'Oriente Boliviano'],
    'União Chilena (UCH)': ['Centro Sur de Chile', 'Metropolitana de Chile', 'Norte de Chile', 'Sur Austral de Chile', 'Central de Chile', 'Chilena del Pacífico', 'Sur Metropolitana de Chile'],
    'União Ecuatoriana (UE)': ['Ecuatoriana del Norte', 'Ecuatoriana del Sur'],
    'União Paraguaya (UP)': ['Paraguaya'],
    'União Peruana del Norte (UPN)': ['Nor Pacífico del Perú', 'Peruana Central Este', 'Centro-Oeste del Perú', 'Nor Oriental', 'Peruana del Norte'],
    'União Peruana del Sur (UPS)': ['Peruana Central', 'Peruana del Sur', 'Central del Perú', 'Oriente Peruano', 'Peruana Central Sur', 'Lago Titicaca', 'Sur Oriental del Perú']
};

type RegistrationMode = 'JOIN' | 'CREATE';

export function Register() {
    const navigate = useNavigate();
    // We don't need login function needed here necessarily if we just redirect, 
    // but AuthContext usually auto-logins on firebase creation.
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<RegistrationMode>('JOIN');

    // Common Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    // Join Mode State
    const [clubId, setClubId] = useState('');
    const [unitId, setUnitId] = useState('');
    const [role, setRole] = useState('PATHFINDER');
    const [clubs, setClubs] = useState<Club[]>([]);
    const [referralCode, setReferralCode] = useState('');

    // Create Mode State
    const [clubName, setClubName] = useState('');
    const [region, setRegion] = useState('');
    const [mission, setMission] = useState('');
    const [union, setUnion] = useState('');

    // Units State
    const [units, setUnits] = useState<Unit[]>([]);

    // Dynamic Options based on selected union
    const availableUnions = Object.keys(HIERARCHY_DATA);
    const availableMissions = HIERARCHY_DATA[union] || [];
    const [inviteClubName, setInviteClubName] = useState('');

    const [searchParams] = useSearchParams();

    // Fetch Clubs - Runs ONCE on mount
    useEffect(() => {
        const fetchClubs = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'clubs'));
                const clubsList: Club[] = [];
                querySnapshot.forEach((doc) => {
                    clubsList.push({ id: doc.id, ...doc.data() } as Club);
                });
                setClubs(clubsList);
            } catch (err) {
                console.error('Error fetching clubs from Firestore:', err);
            }
        };

        fetchClubs();
    }, []);

    // Handle Invite Link & URL Params
    useEffect(() => {
        const checkInvite = async () => {
            const inviteClubId = searchParams.get('clubId') || searchParams.get('clubid') || searchParams.get('clubID');
            const urlClubName = searchParams.get('clubName') || searchParams.get('clubname') || searchParams.get('clubNAME');

            if (inviteClubId) {
                setMode('JOIN');
                setClubId(inviteClubId);

                // If name is already in URL, use it immediately
                if (urlClubName) {
                    setInviteClubName(urlClubName);
                }

                // 1. Try to find in the already loaded list
                if (clubs.length > 0) {
                    const foundClub = clubs.find(c => String(c.id) === String(inviteClubId));
                    if (foundClub) {
                        setInviteClubName(foundClub.name);
                        console.log('Invite club found in loaded list:', foundClub.name);
                        return;
                    }
                }

                // 2. Fallback: Fetch directly from Firestore
                try {
                    const clubDoc = await getDoc(doc(db, 'clubs', inviteClubId));
                    if (clubDoc.exists()) {
                        const data = clubDoc.data();
                        setInviteClubName(data.name);
                        console.log('Invite club fetched by DocID:', data.name);
                        return;
                    }

                    // 3. Last Resort: Query in case the ID is a field and not the DocID
                    console.log('Searching by query for:', inviteClubId);
                    const q = query(collection(db, 'clubs'), where('id', '==', inviteClubId));
                    const qSnapshot = await getDocs(q);
                    if (!qSnapshot.empty) {
                        const data = qSnapshot.docs[0].data();
                        setInviteClubName(data.name);
                        console.log('Invite club found by Query:', data.name);
                        return;
                    }

                    console.warn('Invite club not found in any Firestore method:', inviteClubId);
                } catch (err) {
                    console.error('Error fetching invite club details:', err);
                }
            }
        };

        checkInvite();

        // Other Params (moved outside async to be immediate)
        const urlEmail = searchParams.get('email');
        if (urlEmail) {
            setEmail(urlEmail);
        }

        const isResume = searchParams.get('resume');
        if (isResume) {
            toast.info('Complete o nome do seu Clube para ativar sua conta.');
            setMode('CREATE');
        }

        const refCode = searchParams.get('ref');
        if (refCode) {
            setReferralCode(refCode);
            setMode('CREATE');
            toast.success('Código de indicação aplicado com sucesso!');
        }
    }, [searchParams, clubs]);

    // Fetch Units when Club changes
    useEffect(() => {
        const fetchUnits = async () => {
            if (mode === 'JOIN' && clubId) {
                try {
                    const q = query(collection(db, 'units'), where('clubId', '==', clubId));
                    const querySnapshot = await getDocs(q);
                    const unitsList: Unit[] = [];
                    querySnapshot.forEach((doc) => {
                        unitsList.push({ id: doc.id, ...doc.data() } as Unit);
                    });
                    setUnits(unitsList);
                } catch (err) {
                    console.error('Error fetching units:', err);
                }
            } else {
                setUnits([]);
                setUnitId('');
            }
        };
        fetchUnits();
    }, [clubId, mode]);


    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validation
            if (mode === 'JOIN') {
                if (!clubId) throw new Error('Selecione um Clube.');
                if (!role) throw new Error('Selecione sua função.');
            } else {
                if (!clubName) throw new Error('Digite o nome do seu Clube.');
                if (!region || !mission || !union) throw new Error('Preencha os dados hierárquicos.');
            }

            let user;
            try {
                // 1. Attempt to Create Authentication User
                console.log('[Register] Step 1: Creating Firebase User...');
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                user = userCredential.user;
                console.log('[Register] Step 1 Success: Firebase User Created');
            } catch (authErr: any) {
                // If user already exists, try to sign in to resume flow
                if (authErr.code === 'auth/email-already-in-use') {
                    console.log('[Register] Step 1 Note: Email exists, attempting sign-in as fallback...');
                    try {
                        const { signInWithEmailAndPassword } = await import('firebase/auth');
                        const userCredential = await signInWithEmailAndPassword(auth, email, password);
                        user = userCredential.user;
                        console.log('[Register] Step 1 Success: Signed in existing user');
                    } catch (signInErr) {
                        console.error('[Register] Step 1 Error: Sign-in failed', signInErr);
                        throw new Error('Este email já está cadastrado com outra senha. Tente fazer login ou use outro email.');
                    }
                } else {
                    console.error('[Register] Step 1 Error: Create user failed', authErr);
                    throw authErr;
                }
            }

            if (!user) throw new Error('Falha na autenticação.');

            // Update Display Name
            console.log('[Register] Step 2: Updating user profile name...');
            await updateProfile(user, { displayName: name });

            let finalClubId = clubId;
            let finalRole = role;

            // 2. If Creating Club, create it in Firestore first (Legacy)
            if (mode === 'CREATE') {
                console.log('[Register] Step 3: (Background) Creating Club in Firestore...');
                addDoc(collection(db, 'clubs'), {
                    name: clubName,
                    region,
                    mission,
                    union,
                    ownerId: user.uid,
                    createdAt: new Date().toISOString()
                }).then(clubRef => {
                    console.log('[Register] Step 3 Success (BG): Club created in Firestore:', clubRef.id);
                }).catch(fsErr => {
                    console.warn('[Register] Step 3 Warning (BG): Failed to create legacy club record.', fsErr);
                });

                finalRole = 'OWNER';
                // finalClubId will be empty here, but backend handles creation in step 5
            }

            // 3. Create User Profile in Firestore (Legacy/Stats)
            console.log('[Register] Step 4: (Background) Syncing User Profile to Firestore...');
            setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name,
                email,
                role: finalRole,
                clubId: finalClubId,
                unitId: (mode === 'JOIN' && unitId) ? unitId : null,
                createdAt: new Date().toISOString()
            }, { merge: true }).then(() => {
                console.log('[Register] Step 4 Success (BG): User sync complete');
            }).catch(fsUserErr => {
                console.warn('[Register] Step 4 Warning (BG): Failed to sync legacy user record.', fsUserErr);
            });

            // 4. Register in Backend (PostgreSQL) - CRITICAL FOR LOGIN
            try {
                console.log('[Register] Step 5: Registering in Backend (Postgres)...');
                const registerPayload = {
                    email,
                    password,
                    name,
                    role: finalRole,
                    clubId: (mode === 'JOIN') ? clubId : undefined,
                    unitId: (mode === 'JOIN' && unitId) ? unitId : undefined,
                    clubName: (mode === 'CREATE') ? clubName : undefined,
                    region: (mode === 'CREATE') ? region : undefined,
                    mission: (mode === 'CREATE') ? mission : undefined,
                    union: (mode === 'CREATE') ? union : undefined,
                    referralCode: (mode === 'CREATE') ? referralCode : undefined
                };

                const { api } = await import('../lib/axios');
                const res = await api.post('/auth/register', registerPayload);

                if (res.data && res.data.access_token) {
                    console.log('[Register] Step 5 Success: Backend token received');
                    localStorage.setItem('token', res.data.access_token);
                }

                toast.success(mode === 'CREATE' ? `Clube "${clubName}" criado!` : 'Cadastro realizado!');
                console.log('[Register] Registration Fully Complete!');
                navigate('/dashboard');

            } catch (backendErr: any) {
                console.error("[Register] Step 5 Error: Backend registration failed:", backendErr);
                // If it's a conflict in backend too, it might mean user is fully registered
                if (backendErr.response?.status === 409 || backendErr.response?.data?.message?.includes('already exists')) {
                    console.log('[Register] Step 5 Note: Backend record already exists, redirecting to dashboard...');
                    toast.success('Sua conta já estava ativa!');
                    navigate('/dashboard');
                } else {
                    toast.error("Erro ao sincronizar com o servidor.");
                    throw backendErr;
                }
            }

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else {
                setError(err.message || 'Erro ao criar conta.');
                toast.error(err.message || 'Erro ao criar conta.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden my-8" translate="no">
            <div className="bg-green-600 p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <UserPlus className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
                    <p className="text-green-100">Junte-se ao Cantinho DBV</p>
                </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setMode('JOIN')}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'JOIN' ? 'bg-white text-green-600 border-b-2 border-green-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                    Entrar em um Clube
                </button>
                <button
                    onClick={() => setMode('CREATE')}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'CREATE' ? 'bg-white text-green-600 border-b-2 border-green-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                    Cadastrar Novo Clube
                </button>
            </div>

            <div className="p-8">
                <form onSubmit={handleRegister} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                            <span className="font-bold">Erro:</span> {error}
                        </div>
                    )}

                    {/* Common Fields */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="Seu Nome"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* SEPARATOR */}
                    <div className="border-t border-slate-100 my-4"></div>

                    {mode === 'JOIN' ? (
                        <>
                            {inviteClubName ? (
                                <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4 flex items-start gap-3">
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <Award className="w-6 h-6 text-green-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-green-800 font-bold">Convite Especial</p>
                                        <p className="text-sm text-green-700">
                                            Você está se cadastrando no clube <span className="font-bold underline">{inviteClubName}</span>.
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">Seu cadastro passará por aprovação da diretoria.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-2">
                                    <p>Selecione o clube que você participa.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Clube</label>
                                <div className="relative">
                                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    {inviteClubName ? (
                                        <input
                                            type="text"
                                            value={inviteClubName}
                                            readOnly
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 outline-none cursor-not-allowed font-medium"
                                        />
                                    ) : (
                                        <select
                                            required
                                            value={clubId}
                                            onChange={e => setClubId(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                        >
                                            <option value="">Selecione seu Clube</option>
                                            {clubs.map(club => (
                                                <option key={club.id} value={club.id}>{club.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade (Opcional)</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <select
                                        value={unitId}
                                        onChange={e => setUnitId(e.target.value)}
                                        disabled={!clubId}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">Selecione sua Unidade</option>
                                        {units.map(unit => (
                                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                                <select
                                    required
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                >
                                    <option value="PATHFINDER">Desbravador</option>
                                    <option value="ADMIN">Diretoria</option>
                                    <option value="PARENT">Pais/Responsável</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 mb-2">
                                <p>Você será o <b>Diretor/Admin</b> deste novo clube.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">União</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            required
                                            list="unions-list"
                                            value={union}
                                            onChange={e => {
                                                setUnion(e.target.value);
                                                setMission(''); // Reset mission when union changes
                                            }}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="Ex: União Central Brasileira (UCB)"
                                        />
                                        <datalist id="unions-list">
                                            {availableUnions.map((opt, i) => <option key={i} value={opt} />)}
                                        </datalist>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Missão/Associação</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            required
                                            list="missions-list"
                                            value={mission}
                                            onChange={e => setMission(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="Ex: Paulistana"
                                        />
                                        <datalist id="missions-list">
                                            {availableMissions.map((opt, i) => <option key={i} value={opt} />)}
                                        </datalist>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Região</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            required
                                            list="regions-list"
                                            value={region}
                                            onChange={e => setRegion(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="Ex: R1 ou 1ª Região"
                                        />
                                        <datalist id="regions-list">
                                            {['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'].map((opt, i) => <option key={i} value={opt} />)}
                                        </datalist>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Clube</label>
                                <div className="relative">
                                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        value={clubName}
                                        onChange={e => setClubName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="Ex: Clube Águias"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                    >
                        {loading ? (
                            <span>Processando...</span>
                        ) : (
                            <>
                                <span>{mode === 'CREATE' ? 'Criar Clube e Conta' : 'Solicitar Entrada'}</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-600">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
                        Fazer Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
