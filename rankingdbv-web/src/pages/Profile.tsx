import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, Home, Users, RefreshCw, Plus, Trophy } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { generatePathfinderCard } from '../lib/pdf-generator';
import { Modal } from '../components/Modal';

// Firestore Imports
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { toast } from 'sonner';
import { api } from '../lib/axios';

interface Club {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

const SEX_OPTIONS = [
    { value: 'MASCULINO', label: 'Masculino' },
    { value: 'FEMININO', label: 'Feminino' }
];

export function Profile() {
    const { user } = useAuth(); // Assuming login or updateUser updates context

    // States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [clubId, setClubId] = useState('');
    const [unitId, setUnitId] = useState('');

    // Additional Profile Fields
    const [birthDate, setBirthDate] = useState('');
    const [sex, setSex] = useState('');
    const [cpf, setCpf] = useState('');
    const [mobile, setMobile] = useState('');

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Fetch Full User Data from Backend
    const { data: fullUser, isLoading: isLoadingProfile, refetch: refetchProfile } = useQuery({
        queryKey: ['user-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const res = await api.get(`/users/${user.id}`);
            return res.data;
        },
        enabled: !!user?.id
    });

    // Populate state when data arrives
    useEffect(() => {
        if (fullUser) {
            setName(fullUser.name || '');
            setEmail(fullUser.email || '');
            setClubId(fullUser.clubId || '');
            setUnitId(fullUser.unitId || '');
            setSex(fullUser.sex || '');
            setCpf(fullUser.cpf || '');
            setMobile(fullUser.mobile || '');
            if (fullUser.birthDate) {
                const date = new Date(fullUser.birthDate);
                setBirthDate(date.toISOString().split('T')[0]);
            }
        }
    }, [fullUser]);

    // Creation Modal States
    const [isClubModalOpen, setIsClubModalOpen] = useState(false);
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

    // New Entity States
    const [newClubName, setNewClubName] = useState('');
    const [newClubRegion, setNewClubRegion] = useState('');
    const [newUnitName, setNewUnitName] = useState('');

    // Data Lists
    const [clubs, setClubs] = useState<Club[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);



    // Initial Load: Clubs (Start with ONLY user's current club)
    useEffect(() => {
        // If user already has a club, we don't fetch others.
        // If user has NO club (unlikely if registered properly), maybe fetch public?
        // User asked to RESTRICT. So we just set the current club if available.
        if (fullUser?.club) {
            setClubs([{ id: fullUser.clubId!, name: fullUser.club.name } as Club]);
        }
    }, [fullUser]);

    // Load Units for CURRENT Club Only
    useEffect(() => {
        if (clubId) {
            const fetchUnits = async () => {
                try {
                    const res = await api.get(`/units/club/${clubId}`);
                    setUnits(res.data);
                } catch (err) {
                    console.error("Failed to load units", err);
                }
            };
            fetchUnits();
        } else {
            setUnits([]);
        }
    }, [clubId]);

    const queryClient = useQueryClient();

    const updateProfileMutation = useMutation({
        mutationFn: async (data: any) => {
            // Update via BACKEND API (PostgreSQL)
            await api.patch(`/users/${user!.id}`, data);

            // Also Sync FIRESTORE for legacy/social components
            const userRef = doc(db, 'users', user!.id);
            const updates: any = {
                name: data.name,
                clubId: data.clubId,
                unitId: data.unitId,
                sex: data.sex,
                mobile: data.mobile,
                birthDate: data.birthDate
            };
            await updateDoc(userRef, updates).catch(e => console.warn('Firestore sync failed:', e));

            if (data.password && auth.currentUser) {
                await updatePassword(auth.currentUser, data.password);
            }
        },
        onSuccess: () => {
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            setPassword('');
            setConfirmPassword('');
            toast.success('Perfil atualizado!');
            refetchProfile();
        },
        onError: (err: any) => {
            console.error(err);
            const errMsg = err.response?.data?.message || err.message;
            setMessage({ type: 'error', text: `Erro: ${errMsg}` });
            toast.error('Erro ao atualizar perfil.');
        }
    });

    const createClubMutation = useMutation({
        mutationFn: async () => {
            // Use API to create Club
            const res = await api.post('/clubs', {
                name: newClubName,
                region: newClubRegion
            });
            return res.data;
        },
        onSuccess: (newClub) => {
            setClubId(newClub.id);
            setUnitId(''); // Clear unit
            setIsClubModalOpen(false);
            setNewClubName('');
            setNewClubRegion('');
            queryClient.invalidateQueries({ queryKey: ['ranking'] });

            // Refresh clubs list
            api.get('/clubs/public').then(res => setClubs(res.data));

            toast.success('Clube criado com sucesso!');
        },
        onError: (err: any) => toast.error('Erro ao criar clube: ' + (err.response?.data?.message || err.message))
    });

    const createUnitMutation = useMutation({
        mutationFn: async () => {
            // Use API to create Unit
            const res = await api.post('/units', {
                name: newUnitName,
                clubId: clubId
            });
            return res.data;
        },
        onSuccess: (newUnit) => {
            setUnits([...units, newUnit]);
            setUnitId(newUnit.id);
            setIsUnitModalOpen(false);
            setNewUnitName('');
            toast.success('Unidade criada com sucesso!');
        },
        onError: (err: any) => toast.error('Erro ao criar unidade: ' + (err.response?.data?.message || err.message))
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (password && password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        const payload: any = {
            name,
            clubId,
            unitId,
            sex,
            mobile,
            cpf,
            birthDate
        };
        if (password) payload.password = password;

        updateProfileMutation.mutate(payload);
    };

    return (
        <>
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Meu Perfil</h1>
                    <button
                        onClick={() => {
                            if (user) {
                                generatePathfinderCard(
                                    { ...user, dbvClass: user.dbvClass || 'Não definida' },
                                    clubs.find(c => c.id === clubId)?.name || 'Clube'
                                );
                            }
                        }}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir Ficha
                    </button>
                </div>

                {/* Role Badges */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <h3 className="text-lg font-medium text-slate-700 border-b pb-2 mb-4">Minhas Funções</h3>
                    <div className="flex flex-wrap gap-2">
                        {/* Primary Role */}
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-bold text-sm border border-purple-200">
                            {user?.role} (Principal)
                        </span>

                        {/* Secondary Roles */}
                        {user?.secondaryRoles?.map(role => (
                            <span key={role} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full font-medium text-sm border border-blue-200">
                                {role}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    {message && (
                        <div className={`p-4 mb-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-slate-700 border-b pb-2">Dados Pessoais</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder={isLoadingProfile ? 'Carregando...' : ''}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
                                    <select
                                        value={sex}
                                        onChange={e => setSex(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                    >
                                        <option value="">Selecione...</option>
                                        {SEX_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                                    <input
                                        type="date"
                                        value={birthDate}
                                        onChange={e => setBirthDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                                    <input
                                        type="text"
                                        value={cpf}
                                        onChange={e => setCpf(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Celular</label>
                                    <input
                                        type="text"
                                        value={mobile}
                                        onChange={e => setMobile(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Clube</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            <select
                                                value={clubId}
                                                disabled={true} // ALWAYS DISABLED as per User Request
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg appearance-none bg-gray-100 text-gray-500 cursor-not-allowed"
                                            >
                                                <option value="">Selecione...</option>
                                                {clubs.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsClubModalOpen(true)}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                                            title="Criar Novo Clube"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            <select
                                                value={unitId}
                                                onChange={e => setUnitId(e.target.value)}
                                                disabled={!clubId}
                                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-slate-50"
                                            >
                                                <option value="">Selecione...</option>
                                                {units.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsUnitModalOpen(true)}
                                            disabled={!clubId}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                                            title="Criar Nova Unidade"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-slate-400 mt-1">O email não pode ser alterado.</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-medium text-slate-700 border-b pb-2">Segurança</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha (Opcional)</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Deixe em branco para manter a atual"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                        </div>


                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={updateProfileMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* My Achievements Section */}
                <MyAchievementsList />

                {/* My Specialties Section */}
                <MySpecialtiesList />
            </div>

            {/* Create Club Modal */}
            <Modal
                isOpen={isClubModalOpen}
                onClose={() => setIsClubModalOpen(false)}
                title="Novo Clube"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Clube</label>
                        <input
                            type="text"
                            value={newClubName}
                            onChange={e => setNewClubName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Região (Opcional)</label>
                        <input
                            type="text"
                            value={newClubRegion}
                            onChange={e => setNewClubRegion(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={() => createClubMutation.mutate()}
                            disabled={!newClubName || createClubMutation.isPending}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {createClubMutation.isPending ? 'Criando...' : 'Criar Clube'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Create Unit Modal */}
            <Modal
                isOpen={isUnitModalOpen}
                onClose={() => setIsUnitModalOpen(false)}
                title="Nova Unidade"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Unidade</label>
                        <input
                            type="text"
                            value={newUnitName}
                            onChange={e => setNewUnitName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={() => createUnitMutation.mutate()}
                            disabled={!newUnitName || createUnitMutation.isPending}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {createUnitMutation.isPending ? 'Criando...' : 'Criar Unidade'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

function MySpecialtiesList() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: mySpecialties = [] } = useQuery<any[]>({
        queryKey: ['my-specialties-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            // Join user_specialties with specialties
            const q = query(collection(db, 'user_specialties'), where('userId', '==', user.id));
            const snapshot = await getDocs(q);

            const results = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                // Fetch specialty details
                let specialtyData = { name: 'Unknown', area: 'Geral', imageUrl: null };
                if (data.specialtyId) {
                    const specRef = doc(db, 'specialties', data.specialtyId);
                    const specSnap = await getDoc(specRef);
                    if (specSnap.exists()) {
                        specialtyData = specSnap.data() as any;
                    }
                }

                return {
                    id: docSnap.id,
                    ...data,
                    specialty: specialtyData
                };
            }));
            return results;
        },
        enabled: !!user?.id
    });

    if (mySpecialties.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-slate-800">Minhas Especialidades</h3>
                <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['my-specialties-profile'] })}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-500 transition-colors"
                    title="Atualizar Lista"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mySpecialties.map((us: any) => (
                    <div key={us.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:shadow-sm transition-shadow">
                        {us.specialty.imageUrl ? (
                            <img src={us.specialty.imageUrl} alt="" className="w-12 h-12 object-contain" />
                        ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs">
                                IMG
                            </div>
                        )}
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">{us.specialty.name}</h4>
                            <p className="text-xs text-slate-500">{us.specialty.area}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${us.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                us.status === 'WAITING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                {us.status === 'COMPLETED' ? 'Concluída' :
                                    us.status === 'WAITING_APPROVAL' ? 'Aguardando Aprovação' :
                                        'Em Andamento'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MyAchievementsList() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: myAchievements = [] } = useQuery<any[]>({
        queryKey: ['my-achievements-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            // 1. Fetch User Achievements
            const q = query(collection(db, 'user_achievements'), where('userId', '==', user.id));
            const snapshot = await getDocs(q);
            const userAchievements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            if (userAchievements.length === 0) return [];

            // 2. Fetch All Achievements to map details
            const achSnaps = await getDocs(collection(db, 'achievements'));
            const achievementsMap = new Map();
            achSnaps.docs.forEach(d => achievementsMap.set(d.id, d.data()));

            // 3. Map
            return userAchievements.map(ua => ({
                ...ua,
                details: achievementsMap.get(ua.achievementId) || { name: 'Desconhecido', icon: 'Trophy', description: '?', points: 0 }
            }));
        },
        enabled: !!user?.id
    });

    const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
        const Icon = (LucideIcons as any)[name] || Trophy; // Use LucideIcons namespace
        return <Icon className={className} />;
    };

    if (myAchievements.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-bold text-slate-800">Minhas Conquistas</h3>
                </div>
                <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['my-achievements-profile'] })}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-500 transition-colors"
                    title="Atualizar Lista"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {myAchievements.map((ua: any) => (
                    <div key={ua.id} className="flex flex-col items-center text-center p-4 rounded-lg border border-slate-100 bg-slate-50 hover:shadow-sm transition-shadow">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-blue-600 mb-2 shadow-sm">
                            <DynamicIcon name={ua.details.icon} className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{ua.details.name}</h4>
                        <span className="text-[10px] uppercase font-bold text-blue-500 mt-1">{ua.details.category}</span>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={ua.details.description}>{ua.details.description}</p>
                        <span className="mt-2 text-xs font-medium text-yellow-600">+{ua.details.points} pts</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

