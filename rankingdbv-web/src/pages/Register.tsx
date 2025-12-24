import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, ArrowRight, Home, Users, MapPin, Globe, Award } from 'lucide-react';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Club {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

interface HierarchyOptions {
    regions: string[];
    missions: string[];
    unions: string[];
}

type RegistrationMode = 'JOIN' | 'CREATE';

export function Register() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<RegistrationMode>('JOIN');

    // Common Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Join Mode State
    const [clubId, setClubId] = useState('');
    const [unitId, setUnitId] = useState('');
    const [role, setRole] = useState('PATHFINDER');
    const [clubs, setClubs] = useState<Club[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);

    // Create Mode State
    const [clubName, setClubName] = useState('');
    const [region, setRegion] = useState('');
    const [mission, setMission] = useState('');
    const [union, setUnion] = useState('');
    const [hierarchyOptions, setHierarchyOptions] = useState<HierarchyOptions>({ regions: [], missions: [], unions: [] });

    const [searchParams] = useSearchParams();

    useEffect(() => {
        api.get('/clubs/public')
            .then(response => {
                setClubs(response.data);

                // Handle Invite Link
                const inviteClubId = searchParams.get('clubId');
                if (inviteClubId) {
                    setMode('JOIN');
                    setClubId(inviteClubId);
                    toast.success('Convite aplicado! Complete seu cadastro.');
                }
            })
            .catch(err => console.error('Error fetching clubs:', err));

        api.get('/clubs/hierarchy-options')
            .then(response => setHierarchyOptions(response.data))
            .catch(err => console.error('Error fetching hierarchy options:', err));
    }, [searchParams]);

    useEffect(() => {
        if (mode === 'JOIN' && clubId) {
            api.get(`/units/club/${clubId}`)
                .then(response => setUnits(response.data))
                .catch(err => console.error('Error fetching units:', err));
        } else {
            setUnits([]);
            setUnitId('');
        }
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
                if (!region || !mission || !union) throw new Error('Preencha os dados hierárquicos (Região, Missão, União).');
            }

            const payload = {
                name,
                email,
                password,
                // Join Fields
                clubId: mode === 'JOIN' ? clubId : undefined,
                unitId: mode === 'JOIN' ? unitId : undefined,
                role: mode === 'JOIN' ? role : 'OWNER',
                // Create Fields
                clubName: mode === 'CREATE' ? clubName : undefined,
                region: mode === 'CREATE' ? region : undefined,
                mission: mode === 'CREATE' ? mission : undefined,
                union: mode === 'CREATE' ? union : undefined,
            };

            const response = await api.post('/auth/register', payload);

            const { access_token, user } = response.data;
            login(access_token, user);

            if (mode === 'CREATE') {
                toast.success(`Clube "${clubName}" criado com sucesso!`);
            } else {
                toast.success('Cadastro realizado! Aguarde aprovação do diretor.');
            }

            navigate('/dashboard');

        } catch (err: any) {
            console.error(err);
            if (err.message) {
                setError(err.message);
                toast.error(err.message);
            } else if (err.response?.status === 409) {
                setError('Email já cadastrado.');
                toast.error('Email já cadastrado.');
            } else {
                setError('Erro ao criar conta. Tente novamente.');
                toast.error('Erro ao conectar com o servidor.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden my-8">
            <div className="bg-green-600 p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <UserPlus className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
                    <p className="text-green-100">Junte-se ao Ranking DBV</p>
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
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {/* SEPARATOR */}
                    <div className="border-t border-slate-100 my-4"></div>

                    {mode === 'JOIN' ? (
                        <>
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-2">
                                <p>Selecione o clube que você participa. Seu cadastro ficara pendente até a aprovação.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Clube</label>
                                <div className="relative">
                                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
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
                                <p>Você será o <b>Diretor/Admin</b> deste novo clube. Preencha os dados da hierarquia corretamente.</p>
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
                                            placeholder="Ex: União Central Brasileira"
                                        />
                                        <datalist id="unions-list">
                                            {hierarchyOptions.unions.map((opt, i) => <option key={i} value={opt} />)}
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
                                            placeholder="Ex: Associação Paulistana"
                                            disabled={!union && hierarchyOptions.unions.length > 0} // Optional guidance
                                        />
                                        <datalist id="missions-list">
                                            {(() => {
                                                // Filter missions based on selected Union
                                                const tree = (hierarchyOptions as any).hierarchyTree;
                                                // Try exact match or find loosely
                                                const relatedMissions = tree ? tree[union] : null;

                                                if (relatedMissions) {
                                                    return relatedMissions.map((opt: string, i: number) => <option key={i} value={opt} />);
                                                }
                                                // Fallback: Show all if union not found in tree (or custom union), OR restrict? 
                                                // Let's show all if no tree match to support custom data, 
                                                // or strictly nothing if we want to force hierarchy?
                                                // User wants "Type or Search", so showing all as fallback is safetst.
                                                return hierarchyOptions.missions.map((opt, i) => <option key={i} value={opt} />);
                                            })()}
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
                                            placeholder="Ex: Região 1"
                                        />
                                        <datalist id="regions-list">
                                            {hierarchyOptions.regions.map((opt, i) => <option key={i} value={opt} />)}
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
                        {loading ? 'Processando...' : (
                            <>
                                {mode === 'CREATE' ? 'Criar Clube e Conta' : 'Solicitar Entrada'}
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
