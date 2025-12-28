import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, Home, Users, RefreshCw, Plus } from 'lucide-react';
import { generatePathfinderCard } from '../lib/pdf-generator';
import { Modal } from '../components/Modal';

// Firestore Imports
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { toast } from 'sonner';

interface Club {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

export function Profile() {
    const { user } = useAuth(); // Assuming login or updateUser updates context

    // States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [clubId, setClubId] = useState('');
    const [unitId, setUnitId] = useState('');

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setClubId(user.clubId || '');
            setUnitId(user.unitId || '');
        }
    }, [user]);

    // Initial Load: Clubs
    useEffect(() => {
        const fetchClubs = async () => {
            const snaps = await getDocs(collection(db, 'clubs'));
            setClubs(snaps.docs.map(d => ({ id: d.id, ...d.data() } as Club)));
        };
        fetchClubs();
    }, []);

    // Load Units when Club Changes
    useEffect(() => {
        if (clubId) {
            const fetchUnits = async () => {
                const q = query(collection(db, 'units'), where('clubId', '==', clubId));
                const snaps = await getDocs(q);
                setUnits(snaps.docs.map(d => ({ id: d.id, ...d.data() } as Unit)));
            };
            fetchUnits();
        } else {
            setUnits([]);
        }
    }, [clubId]);

    const queryClient = useQueryClient();

    const updateProfileMutation = useMutation({
        mutationFn: async (data: any) => {
            const userRef = doc(db, 'users', user!.id);
            const updates: any = {
                name: data.name,
                clubId: data.clubId,
                unitId: data.unitId
            };

            await updateDoc(userRef, updates);

            if (data.password && auth.currentUser) {
                await updatePassword(auth.currentUser, data.password);
            }
        },
        onSuccess: () => {
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            setPassword('');
            setConfirmPassword('');
            toast.success('Perfil atualizado!');
            // updateEmail is tricky without re-auth, we skip it for now or assume email is read-only in UI
        },
        onError: (err: any) => {
            console.error(err);
            if (err.code === 'auth/requires-recent-login') {
                setMessage({ type: 'error', text: 'Para alterar a senha, faça login novamente.' });
                toast.error('Requer login recente.');
            } else {
                setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
            }
        }
    });

    const createClubMutation = useMutation({
        mutationFn: async () => {
            const docRef = await addDoc(collection(db, 'clubs'), {
                name: newClubName,
                region: newClubRegion,
                createdAt: new Date().toISOString()
            });
            return { id: docRef.id, name: newClubName };
        },
        onSuccess: (newClub) => {
            setClubId(newClub.id);
            setUnitId(''); // Clear unit
            setIsClubModalOpen(false);
            setNewClubName('');
            setNewClubRegion('');
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            // Refresh clubs list manually or rely on useEffect? 
            // Better to append to local state or re-fetch
            getDocs(collection(db, 'clubs')).then(snaps => setClubs(snaps.docs.map(d => ({ id: d.id, ...d.data() } as Club))));

            toast.success('Clube criado com sucesso!');
        },
        onError: () => toast.error('Erro ao criar clube.')
    });

    const createUnitMutation = useMutation({
        mutationFn: async () => {
            const docRef = await addDoc(collection(db, 'units'), {
                name: newUnitName,
                clubId: clubId, // Use current selected clubId
                createdAt: new Date().toISOString()
            });
            return { id: docRef.id, name: newUnitName };
        },
        onSuccess: (newUnit) => {
            setUnits([...units, newUnit]);
            setUnitId(newUnit.id);
            setIsUnitModalOpen(false);
            setNewUnitName('');
            toast.success('Unidade criada com sucesso!');
        },
        onError: () => toast.error('Erro ao criar unidade.')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (password && password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        const payload: any = { name, clubId, unitId };
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
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Clube</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            <select
                                                value={clubId}
                                                onChange={e => {
                                                    setClubId(e.target.value);
                                                    setUnitId(''); // Reset Unit when Club changes
                                                }}
                                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white"
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

