import { useState } from 'react';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { ChevronRight, ChevronDown, Building2, MapPin, Globe, Pencil, Trash2, Plus, Settings, AlertTriangle, Search, LayoutGrid, List, DollarSign, Send, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { ClubSubscriptionModal } from '../components/ClubSubscriptionModal';
import { EditClubModal } from '../components/EditClubModal';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, format } from 'date-fns';

interface HierarchyNode {
    id: string;
    name: string;
}

interface TreeData {
    [union: string]: {
        [mission: string]: {
            [region: string]: HierarchyNode[];
        };
    };
}

export function Hierarchy() {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
    const [searchTerm, setSearchTerm] = useState('');

    // --- QUERY: TREE DATA ---
    const { data: tree = {}, refetch: refetchTree } = useQuery({
        queryKey: ['hierarchy-tree'],
        queryFn: async () => (await api.get('/clubs/hierarchy-tree')).data
    });

    // --- QUERY: DETAILED CLUBS DATA (DASHBOARD) ---
    const { data: allClubs = [], isLoading: loadingClubs, refetch: refetchClubs } = useQuery({
        queryKey: ['clubs-dashboard'],
        queryFn: async () => (await api.get('/clubs/dashboard')).data
    });

    // State for Modals
    const [editingSubscription, setEditingSubscription] = useState<any | null>(null);
    const [editingClubData, setEditingClubData] = useState<any | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newClub, setNewClub] = useState({ name: '', union: '', mission: '', region: '' });
    const [createLoading, setCreateLoading] = useState(false);
    const [editingNode, setEditingNode] = useState<{ level: 'union' | 'mission' | 'region', oldName: string, newName: string } | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedClubForPayment, setSelectedClubForPayment] = useState<any | null>(null);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [sendingPayment, setSendingPayment] = useState(false);

    const DEFAULT_PAYMENT_MSG = `Olá! Sua assinatura do Cantinho DBV está vencendo. Para renovar, faça um PIX para a chave: 68323280282 (Alex Oliveira Seabra) e envie o comprovante.`;

    const openPaymentModal = (club: any) => {
        setSelectedClubForPayment(club);
        setPaymentMessage(DEFAULT_PAYMENT_MSG);
        setPaymentModalOpen(true);
    };

    const handleSendPayment = async () => {
        if (!selectedClubForPayment) return;
        setSendingPayment(true);
        try {
            await api.post(`/clubs/${selectedClubForPayment.id}/send-payment-info`, { message: paymentMessage });
            toast.success('Cobrança enviada com sucesso!');
            setPaymentModalOpen(false);
        } catch (error) {
            toast.error('Erro ao enviar cobrança.');
        } finally {
            setSendingPayment(false);
        }
    };

    // Filter Logic for Table
    const filteredClubs = allClubs.filter((club: any) =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.union?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.mission?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a: any, b: any) => {
        // Sort by expiration date (closest to today first)
        // Null dates go last
        if (!a.nextBillingDate) return 1;
        if (!b.nextBillingDate) return -1;
        return new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime();
    });

    // Stats
    const totalClubs = allClubs.length;
    const activeLicenses = allClubs.filter((c: any) => c.subscriptionStatus === 'ACTIVE' || c.subscriptionStatus === 'TRIAL').length;
    const expiringSoon = allClubs.filter((c: any) => {
        if (!c.nextBillingDate) return false;
        const days = differenceInDays(new Date(c.nextBillingDate), new Date());
        return days <= 30 && days >= 0;
    }).length;


    // --- ACTIONS ---
    const toggle = (key: string) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleCreateClub = async () => {
        if (!newClub.name || !newClub.union || !newClub.mission || !newClub.region) return toast.error('Preencha tudo!');
        setCreateLoading(true);
        try {
            await api.post('/clubs', newClub);
            toast.success('Criado!');
            setIsCreateOpen(false);
            setNewClub({ name: '', union: '', mission: '', region: '' });
            refetchTree();
            refetchClubs();
        } catch (e) { toast.error('Erro ao criar.'); }
        finally { setCreateLoading(false); }
    };

    const handleRename = async () => {
        if (!editingNode) return;
        try {
            await api.patch('/clubs/hierarchy/rename', editingNode);
            toast.success('Renomeado!');
            setEditingNode(null);
            refetchTree();
        } catch (e) { toast.error('Erro ao renomear.'); }
    };

    const handleDeleteNode = async (level: string, name: string) => {
        if (!confirm('Tem certeza? Isso oculpará os clubes deste nível no filtro de árvore, mas não deletará os clubes.')) return;
        try {
            await api.delete('/clubs/hierarchy', { params: { level, name } });
            toast.success('Removido!');
            refetchTree();
        } catch (e) { toast.error('Erro ao remover.'); }
    };

    const handleDeleteClub = async (id: string, name: string) => {
        if (!confirm(`TEM CERTEZA? Isso deletará PERMANENTEMENTE o clube "${name}" e TODOS os seus membros, atividades e dados financeira. Esta ação não pode ser desfeita.`)) return;
        try {
            await api.delete(`/clubs/${id}`);
            toast.success('Clube removido definitivamente!');
            refetchTree();
            refetchClubs();
        } catch (e: any) {
            toast.error('Erro ao remover clube. Verifique se existem membros vinculados que impedem a exclusão.');
        }
    };


    if (user?.email !== 'master@cantinhodbv.com' && user?.role !== 'MASTER') {
        return <div className="p-8 text-center text-red-500">Acesso restrito ao Master.</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* --- HEADER & STATS --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        Gestão de Clubes & Licenças
                    </h1>
                    <p className="text-slate-500">Administre hierarquias, clubes e assinaturas.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm self-start md:self-auto"
                >
                    <Plus className="w-5 h-5" /> Novo Clube
                </button>
            </div>

            {/* --- DASHBOARD CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl bordered border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total de Clubes</p>
                        <h3 className="text-2xl font-bold text-slate-800">{totalClubs}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl bordered border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                        <Settings className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Licenças Ativas</p>
                        <h3 className="text-2xl font-bold text-slate-800">{activeLicenses}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl bordered border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-yellow-500">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Vencendo em 30 dias</p>
                        <h3 className="text-2xl font-bold text-slate-800">{expiringSoon}</h3>
                    </div>
                </div>
            </div>

            {/* --- CONTROLS --- */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar clube, união ou missão..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                </div>

                {/* View Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List className="w-4 h-4" /> Lista Detalhada
                    </button>
                    <button
                        onClick={() => setViewMode('tree')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'tree' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutGrid className="w-4 h-4" /> Estrutura
                    </button>
                </div>
            </div>

            {/* --- CONTENT --- */}
            {viewMode === 'table' ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="p-4 font-bold">Clube / Localização</th>
                                    <th className="p-4 font-bold">Status</th>
                                    <th className="p-4 font-bold">Plano</th>
                                    <th className="p-4 font-bold">Vencimento</th>
                                    <th className="p-4 font-bold text-center">Membros</th>
                                    <th className="p-4 font-bold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {loadingClubs ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">Carregando dados...</td></tr>
                                ) : filteredClubs.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum clube encontrado.</td></tr>
                                ) : (
                                    filteredClubs.map((club: any) => {
                                        // Calc status color
                                        const daysTo = club.nextBillingDate ? differenceInDays(new Date(club.nextBillingDate), new Date()) : 999;
                                        const isExpired = club.subscriptionStatus === 'EXPIRED' || (club.nextBillingDate && daysTo < 0);
                                        const isWarning = !isExpired && daysTo <= 30;

                                        const statusColorClass = isExpired ? 'bg-red-100 text-red-700 border-red-200'
                                            : isWarning ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                : 'bg-green-100 text-green-700 border-green-200';

                                        const statusText = isExpired ? 'VENCIDO' : isWarning ? 'VENCE EM BREVE' : 'ATIVO';

                                        return (
                                            <tr key={club.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-800">{club.name}</div>
                                                    <div className="flex flex-col gap-1 mt-1">
                                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Globe className="w-3 h-3 text-slate-400" /> {club.union}
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-slate-400" /> {club.mission} / {club.region}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColorClass}`}>
                                                        {statusText}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1">
                                                        {club.planTier === 'FREE' && <span className="bg-slate-100 text-slate-600 px-2 rounded text-xs font-bold">GRÁTIS</span>}
                                                        {club.planTier === 'PREMIUM' && <span className="bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 px-2 rounded text-xs font-bold">PREMIUM</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{club.nextBillingDate ? format(new Date(club.nextBillingDate), 'dd/MM/yyyy') : '-'}</span>
                                                        {isWarning && <span className="text-xs text-yellow-600 font-bold mt-0.5">({daysTo} dias)</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="bg-slate-100 px-2 py-1 rounded-full text-xs font-bold text-slate-600 mb-1" title="Membros Pagantes (Ativos)">
                                                            {club.activeMembers || 0} / {club.memberLimit || '∞'}
                                                        </span>
                                                        {club.freeMembers > 0 && (
                                                            <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100" title="Pais / Isentos">
                                                                + {club.freeMembers} Pais
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openPaymentModal(club)}
                                                            className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 hover:border-green-400 bg-green-50 px-3 py-1.5 rounded transition-all flex items-center gap-1"
                                                            title="Enviar Cobrança"
                                                        >
                                                            <DollarSign className="w-3 h-3" /> Cobrar
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingSubscription(club)}
                                                            className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:border-blue-400 bg-blue-50 px-3 py-1.5 rounded transition-all"
                                                        >
                                                            Assinatura
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingClubData(club)}
                                                            className="p-1.5 text-slate-400 hover:text-amber-600 border border-transparent hover:border-amber-100 rounded"
                                                            title="Trocar Diretor"
                                                        >
                                                            <UserCog className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingClubData(club)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 border border-transparent hover:border-blue-100 rounded"
                                                            title="Editar Clube"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClub(club.id, club.name)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 border border-transparent hover:border-red-100 rounded"
                                                            title="Excluir Clube"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* TREE VIEW (Existing Logic) */
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                    {/* Reuse exact same tree rendering logic... */}
                    {Object.entries(tree as TreeData).map(([union, missions]) => (
                        <div key={union} className="border-l-2 border-blue-200 pl-4 group/union">
                            <div className="flex items-center justify-between hover:bg-slate-50 p-2 rounded">
                                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggle(union)}>
                                    {expanded[union] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                    <Globe className="w-5 h-5 text-blue-600" />
                                    <span className="font-bold text-lg text-slate-800">{union}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/union:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingNode({ level: 'union', oldName: union, newName: union })} className="p-1 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteNode('union', union)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {expanded[union] && (
                                <div className="mt-2 ml-4 space-y-2">
                                    {Object.entries(missions).map(([mission, regions]) => (
                                        <div key={mission} className="border-l-2 border-green-200 pl-4 group/mission">
                                            <div className="flex items-center justify-between hover:bg-slate-50 p-2 rounded">
                                                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggle(`${union}-${mission}`)}>
                                                    {expanded[`${union}-${mission}`] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                    <MapPin className="w-5 h-5 text-green-600" />
                                                    <span className="font-semibold text-slate-700">{mission}</span>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover/mission:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingNode({ level: 'mission', oldName: mission, newName: mission })} className="p-1 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteNode('mission', mission)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>

                                            {expanded[`${union}-${mission}`] && (
                                                <div className="mt-2 ml-4 space-y-2">
                                                    {Object.entries(regions).map(([region, clubs]) => (
                                                        <div key={region} className="border-l-2 border-orange-200 pl-4 group/region">
                                                            <div className="flex items-center justify-between hover:bg-slate-50 p-2 rounded">
                                                                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggle(`${union}-${mission}-${region}`)}>
                                                                    {expanded[`${union}-${mission}-${region}`] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                                    <div className="w-4 h-4 rounded-full border-2 border-orange-400"></div>
                                                                    <span className="font-medium text-slate-600">{region}</span>
                                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{clubs.length} clubes</span>
                                                                </div>
                                                                <div className="flex gap-1 opacity-0 group-hover/region:opacity-100 transition-opacity">
                                                                    <button onClick={() => setEditingNode({ level: 'region', oldName: region, newName: region })} className="p-1 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleDeleteNode('region', region)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                            {expanded[`${union}-${mission}-${region}`] && (
                                                                <div className="mt-2 ml-8 grid gap-2">
                                                                    {clubs.map(club => (
                                                                        <div key={club.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded border border-slate-100 group">
                                                                            <div className="flex items-center gap-2">
                                                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                                                <span className="text-sm text-slate-700">{club.name}</span>
                                                                            </div>
                                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button onClick={() => setEditingSubscription(club as any)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Assinatura"><Settings className="w-4 h-4" /></button>
                                                                                <button onClick={() => setEditingClubData(club as any)} className="p-1 text-slate-400 hover:text-amber-600 transition-colors" title="Trocar Diretor"><UserCog className="w-4 h-4" /></button>
                                                                                <button onClick={() => setEditingClubData(club as any)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Editar Clube"><Pencil className="w-4 h-4" /></button>
                                                                                <button onClick={() => handleDeleteClub(club.id, club.name)} className="p-1 text-slate-400 hover:text-red-600 transition-colors" title="Excluir Clube"><Trash2 className="w-4 h-4" /></button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {Object.keys(tree).length === 0 && <p className="text-slate-500 italic">Nenhum clube encontrado.</p>}
                </div>
            )}

            {/* MODALS RZUSE */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Novo Clube</h3>
                        <div className="space-y-4">
                            <input value={newClub.union} onChange={e => setNewClub({ ...newClub, union: e.target.value })} placeholder="União" className="w-full px-3 py-2 border rounded" />
                            <input value={newClub.mission} onChange={e => setNewClub({ ...newClub, mission: e.target.value })} placeholder="Missão" className="w-full px-3 py-2 border rounded" />
                            <input value={newClub.region} onChange={e => setNewClub({ ...newClub, region: e.target.value })} placeholder="Região" className="w-full px-3 py-2 border rounded" />
                            <input value={newClub.name} onChange={e => setNewClub({ ...newClub, name: e.target.value })} placeholder="Nome do Clube" className="w-full px-3 py-2 border rounded" />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                            <button onClick={handleCreateClub} disabled={createLoading} className="px-4 py-2 bg-blue-600 text-white rounded">{createLoading ? '...' : 'Criar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {editingNode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Renomear</h3>
                        <input value={editingNode.newName} onChange={e => setEditingNode({ ...editingNode, newName: e.target.value })} className="w-full px-4 py-2 border rounded mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingNode(null)} className="px-4 py-2 text-slate-600">Cancelar</button>
                            <button onClick={handleRename} className="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {editingSubscription && (
                <ClubSubscriptionModal
                    club={editingSubscription}
                    onClose={() => setEditingSubscription(null)}
                    onSave={() => {
                        setEditingSubscription(null);
                        refetchClubs();
                        toast.success('Assinatura atualizada.');
                    }}
                />
            )}

            {editingClubData && (
                <EditClubModal
                    club={editingClubData}
                    onClose={() => setEditingClubData(null)}
                    onSave={() => {
                        setEditingClubData(null);
                        refetchClubs();
                        refetchTree();
                    }}
                />
            )}
            {/* Payment Modal */}
            {paymentModalOpen && selectedClubForPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Enviar Cobrança: {selectedClubForPayment.name}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Esta ação enviará uma notificação para os donos e diretores do clube.</p>

                        <textarea
                            value={paymentMessage}
                            onChange={e => setPaymentMessage(e.target.value)}
                            className="w-full h-32 p-3 border rounded-lg text-sm mb-4 bg-slate-50"
                        />

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                            <button
                                onClick={handleSendPayment}
                                disabled={sendingPayment}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {sendingPayment ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar Cobrança</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
