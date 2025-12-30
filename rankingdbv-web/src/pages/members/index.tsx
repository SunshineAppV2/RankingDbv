
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Share2, Plus, ListChecks, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { MemberDetailsModal } from '../../components/MemberDetailsModal';
import { MemberForm } from './components/MemberForm';
import { MembersTable } from './components/MembersTable';
import { PendingApprovalsList, PendingDeliveriesList } from './components/PendingList';
import type { Member, Unit } from './types';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    <h2 className="text-xl font-bold mb-2">Algo deu errado.</h2>
                    <p className="mb-4">Por favor, recarregue a página.</p>
                    <details className="mt-2 p-2 bg-red-100 rounded text-xs font-mono whitespace-pre-wrap">
                        <summary>Ver Detalhes do Erro</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.error && this.state.error.stack}
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

function MembersContent() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    // Assign Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedRequirementId, setSelectedRequirementId] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [classFilter, setClassFilter] = useState('');
    const CLASSES = ['AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];

    const [inspectingMember, setInspectingMember] = useState<Member | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Queries
    const { data: members = [], isLoading, error } = useQuery<Member[]>({
        queryKey: ['members', user?.clubId, user?.email],
        queryFn: async () => {
            const url = user?.email === 'master@cantinhodbv.com' ? '/users' : `/users?clubId=${user?.clubId}`;
            const res = await api.get(url);
            return res.data;
        },
        enabled: !!user?.id
    });

    const { data: units = [] } = useQuery<Unit[]>({
        queryKey: ['units', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const res = await api.get(`/units?clubId=${user?.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs-list'],
        queryFn: async () => {
            const res = await api.get('/clubs');
            return res.data;
        },
        enabled: user?.email === 'master@cantinhodbv.com',
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    const { data: requirements = [] } = useQuery<any[]>({
        queryKey: ['requirements', classFilter],
        queryFn: async () => {
            const res = await api.get('/requirements');
            let reqs = res.data;
            if (classFilter) {
                reqs = reqs.filter((r: any) => r.dbvClass === classFilter);
            }
            return reqs;
        },
        enabled: isAssignModalOpen
    });

    const { data: clubStatus } = useQuery({
        queryKey: ['club-status', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return null;
            const res = await api.get('/clubs/status'); // Using the correct endpoint
            return res.data;
        },
        enabled: !!user?.clubId
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post('/users', {
                ...data,
                clubId: data.clubId || user?.clubId
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            closeModal();
            toast.success('Membro adicionado com sucesso!');
        },
        onError: (e: any) => toast.error('Erro ao criar membro: ' + (e.response?.data?.message || e.message))
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: any) => {
            await api.patch(`/users/${id}`, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            queryClient.invalidateQueries({ queryKey: ['units'] });
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            closeModal();
            toast.success('Membro atualizado com sucesso');
        },
        onError: (e: any) => toast.error('Erro ao atualizar membro: ' + (e.response?.data?.message || e.message))
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            toast.success('Membro excluído com sucesso');
        },
        onError: (e: any) => toast.error('Erro ao excluir membro: ' + (e.response?.data?.message || e.message))
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async (member: Member) => {
            const newStatus = member.isActive ? 'BLOCKED' : 'ACTIVE';
            const newIsActive = !member.isActive;
            await api.patch(`/users/${member.id}`, { status: newStatus, isActive: newIsActive });
        },
        onSuccess: () => {
            toast.success('Status do usuário atualizado!');
            queryClient.invalidateQueries({ queryKey: ['members'] });
        },
        onError: () => toast.error('Erro ao atualizar status.')
    });

    const handleToggleStatus = (member: Member) => {
        const action = member.isActive ? 'bloquear' : 'desbloquear';
        if (window.confirm(`Tem certeza que deseja ${action} o usuário ${member.name}?`)) {
            toggleStatusMutation.mutate(member);
        }
    };

    const assignMutation = useMutation({
        mutationFn: async ({ rid, uids }: any) => {
            const promises = uids.map((uid: string) => {
                return api.post('/activities/award/direct', {
                    requirementId: rid,
                    userId: uid,
                    status: 'APPROVED'
                });
            });
            await Promise.all(promises);
        },
        onSuccess: () => { toast.success('Atribuído com sucesso!'); setIsAssignModalOpen(false); setSelectedMemberIds([]); setSelectedRequirementId(''); },
        onError: (e: any) => toast.error('Erro ao atribuir: ' + (e.response?.data?.message || e.message))
    });

    // Handlers
    const handleFormSubmit = (formData: any) => {
        const payload: any = { ...formData };
        if (!payload.password) delete payload.password;
        // cleanup
        ['id', 'classProgress', 'requirements', 'createdAt', 'updatedAt', 'UserRequirements', 'club', 'unit', 'status'].forEach(k => delete payload[k]);

        if (editingMember) updateMutation.mutate({ id: editingMember.id, updates: payload });
        else createMutation.mutate(payload);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingMember(null); };

    const [searchParams] = useSearchParams();
    const pendingApprovalsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (searchParams.get('action') === 'approvals' && pendingApprovalsRef.current) {
            pendingApprovalsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [searchParams]);

    const isLimitReached = clubStatus && clubStatus.activeMembers >= clubStatus.memberLimit;


    const handleCopyInvite = async () => {
        if (!user?.clubId) return toast.error('Erro: ID do clube não encontrado.');

        const origin = window.location.origin;
        const link = `${origin}/register?clubId=${user.clubId}&clubName=${encodeURIComponent(clubStatus?.name || '')}`;

        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            toast.warning('Atenção: Link Localhost só funcionará neste computador.');
        }

        try {
            await navigator.clipboard.writeText(link);
            toast.success('Link de convite copiado!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = link;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                toast.success('Link copiado (fallback)!');
            } catch (err) {
                toast.error('Não foi possível copiar o link via clipboard ou fallback.');
                prompt('Copie o link manualmente:', link);
            }
            document.body.removeChild(textArea);
        }
    };

    if (isLoading) return <div className="p-10 text-center">Carregando membros...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Erro ao carregar membros.</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">{user?.role === 'COUNSELOR' ? 'Minha Unidade' : 'Membros'}</h1>
                <div className="flex gap-2">
                    {(['COUNSELOR', 'OWNER', 'ADMIN', 'INSTRUCTOR'].includes(user?.role || '') || user?.email === 'master@cantinhodbv.com') && (
                        <button onClick={() => { setIsAssignModalOpen(true); setSelectedMemberIds(members.map(m => m.id)); }} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                            <ListChecks className="w-5 h-5" /> Enviar Requisito
                        </button>
                    )}
                    {(['OWNER', 'ADMIN'].includes(user?.role || '') || user?.email === 'master@cantinhodbv.com') && (
                        <>
                            <button onClick={handleCopyInvite} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                                <Share2 className="w-5 h-5" /> Convite
                            </button>
                            <button
                                onClick={() => {
                                    if (isLimitReached && user?.email !== 'master@cantinhodbv.com') {
                                        toast.error('Limite de usuários atingido. Faça upgrade do plano.');
                                        return;
                                    }
                                    setEditingMember(null);
                                    setIsModalOpen(true);
                                }}
                                disabled={!!isLimitReached && user?.email !== 'master@cantinhodbv.com'}
                                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-white ${(isLimitReached && user?.email !== 'master@cantinhodbv.com') ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                <Plus className="w-5 h-5" /> Adicionar Membro
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isLimitReached && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800">
                    <div className="p-2 bg-amber-100 rounded-full">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold">Limite de Usuários Atingido</h3>
                        <p className="text-sm">
                            Você atingiu o limite de {clubStatus?.memberLimit} usuários ativos do seu plano atual.
                            Novos cadastros estão bloqueados. <br />
                            <a href="https://wa.me/5568323280282" target="_blank" rel="noreferrer" className="underline font-bold hover:text-amber-900">
                                Fale com o suporte para fazer upgrade.
                            </a>
                        </p>
                    </div>
                </div>
            )}

            <PendingApprovalsList ref={pendingApprovalsRef} />
            <PendingDeliveriesList />

            <MembersTable
                members={members}
                units={units}
                onInspect={(m) => { setInspectingMember(m); setIsDetailsOpen(true); }}
                onEdit={(m) => { setEditingMember(m); setIsModalOpen(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggleStatus={handleToggleStatus}
            />

            {/* Modals */}
            <MemberForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleFormSubmit}
                initialData={editingMember}
                units={units}
                clubs={clubs}
                members={members}
            />

            {/* Assign Modal - Kept here for simplicity as it requires local state of selection */}
            <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Enviar Requisito">
                <div className="space-y-4">
                    <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full p-2 border rounded">
                        <option value="">Todas as Classes</option>
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={selectedRequirementId} onChange={e => setSelectedRequirementId(e.target.value)} className="w-full p-2 border rounded">
                        <option value="">Selecione Requisito...</option>
                        {requirements.map(r => <option key={r.id} value={r.id}>{r.code} - {r.description}</option>)}
                    </select>
                    <div className="max-h-60 overflow-y-auto border rounded p-2">
                        {members.map(m => (
                            <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-gray-50">
                                <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => {
                                    setSelectedMemberIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])
                                }} />
                                <span>{m.name}</span>
                            </label>
                        ))}
                    </div>
                    <button onClick={e => { e.preventDefault(); assignMutation.mutate({ rid: selectedRequirementId, uids: selectedMemberIds }) }} className="w-full bg-purple-600 text-white p-2 rounded">Enviar</button>
                </div>
            </Modal>

            {inspectingMember && (
                <MemberDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} member={inspectingMember} />
            )}
        </div>
    );
}

export function Members() {
    return (
        <ErrorBoundary>
            <MembersContent />
        </ErrorBoundary>
    );
}
