import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Search, UserCircle, Users, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Club {
    id: string;
    name: string;
    region: string;
    district: string;
    activeMembers: number;
    totalMembers: number;
    planTier: string;
    subscriptionStatus: 'ACTIVE' | 'PastDue' | 'CANCELED' | 'TRIAL' | 'OVERDUE';
    directorName?: string;
    directorMobile?: string;
}

export function ClubDirectory() {
    const { user } = useAuth();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchClubs = async () => {
            try {
                const response = await api.get('/clubs/dashboard');
                setClubs(response.data);
            } catch (error) {
                console.error('Error fetching clubs:', error);
                toast.error('Erro ao carregar lista de clubes');
            } finally {
                setLoading(false);
            }
        };

        fetchClubs();
    }, []);

    const filteredClubs = clubs.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.directorName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700';
            case 'TRIAL': return 'bg-blue-100 text-blue-700';
            case 'PastDue':
            case 'OVERDUE': return 'bg-red-100 text-red-700'; // Inadimplente
            case 'CANCELED': return 'bg-slate-100 text-slate-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Ativo';
            case 'TRIAL': return 'Teste Grátis';
            case 'PastDue':
            case 'OVERDUE': return 'Inadimplente';
            case 'CANCELED': return 'Cancelado';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Diretório de Clubes</h1>
                    <p className="text-slate-600">
                        {user?.role === 'MASTER' ? 'Todos os Clubes' : `Sua Região / Distrito`}
                    </p>
                </div>

                {/* Stats Cards Small */}
                <div className="flex gap-3">
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                        <span className="block text-xs text-slate-500 uppercase font-bold">Total Clubes</span>
                        <span className="text-xl font-bold text-slate-800">{clubs.length}</span>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                        <span className="block text-xs text-slate-500 uppercase font-bold">Membros</span>
                        <span className="text-xl font-bold text-slate-800">{clubs.reduce((acc, c) => acc + c.totalMembers, 0)}</span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar por nome do clube ou diretor..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table / List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 font-semibold text-slate-700 text-sm">Clube</th>
                                <th className="p-4 font-semibold text-slate-700 text-sm">Diretoria</th>
                                <th className="p-4 font-semibold text-slate-700 text-sm text-center">Membros</th>
                                <th className="p-4 font-semibold text-slate-700 text-sm text-center">Status</th>
                                <th className="p-4 font-semibold text-slate-700 text-sm text-center">Financeiro</th>
                                <th className="p-4 font-semibold text-slate-700 text-sm text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredClubs.map((club) => (
                                <tr key={club.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                                {club.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{club.name}</p>
                                                <p className="text-xs text-slate-500">{club.region} | {club.district}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <UserCircle className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm text-slate-700">{club.directorName || 'Sem Diretor'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                                            <Users className="w-3 h-3 text-slate-500" />
                                            <span className="text-sm font-medium text-slate-700">{club.totalMembers}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${club.activeMembers > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {club.activeMembers > 0 ? 'Ativo' : 'Pendente'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(club.subscriptionStatus)}`}>
                                            {getStatusText(club.subscriptionStatus)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {club.directorMobile && (
                                            <a
                                                href={`https://wa.me/${club.directorMobile.replace(/\D/g, '')}?text=Olá Diretor(a) do clube ${club.name}, tudo bem?`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm"
                                                title="Entrar em contato via WhatsApp"
                                            >
                                                <MessageCircle className="w-5 h-5" />
                                            </a>
                                        )}
                                        {!club.directorMobile && (
                                            <span className="text-xs text-slate-400">Sem contato</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredClubs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        Nenhum clube encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
