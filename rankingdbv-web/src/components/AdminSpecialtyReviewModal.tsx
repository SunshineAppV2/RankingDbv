
import { X, CheckCircle, FileText, Download, BookOpen } from 'lucide-react';
import { api } from '../lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Requirement {
    id: string;
    description: string;
    type: 'TEXT' | 'FILE';
    area?: string;
    code?: string;
}

interface ItemContext {
    type: 'SPECIALTY' | 'CLASS';
    id: string; // specialtyId or className (e.g., 'AMIGO')
    title: string;
}

interface Member {
    id: string;
    name: string;
}

interface UserRequirement {
    requirementId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    answerText?: string;
    answerFileUrl?: string;
}

interface AdminSpecialtyReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    context: ItemContext;
    member: Member;
}



export function AdminSpecialtyReviewModal({ isOpen, onClose, context, member, initialUserRequirements = [] }: AdminSpecialtyReviewModalProps & { initialUserRequirements?: UserRequirement[] }) {
    const queryClient = useQueryClient();

    // 1. Fetch Requirements List (Context Definition)
    const { data: requirements = [] } = useQuery<Requirement[]>({
        queryKey: ['requirements-context', context.type, context.id],
        queryFn: async () => {
            if (context.type === 'SPECIALTY') {
                const res = await api.get(`/specialties/${context.id}`);
                return res.data.requirements;
            } else {
                // Class
                const res = await api.get('/requirements', { params: { class: context.id } });
                return res.data;
            }
        },
        enabled: isOpen && !!context.id
    });

    // 2. Fetch User Progress
    // 2. Fetch User Progress
    const { data: fetchedProgress, refetch } = useQuery<UserRequirement[]>({
        queryKey: ['user-progress', member.id, context.type, context.id],
        queryFn: async () => {
            // Updated backend supports fetching by specialtyId OR dbvClass name using the same endpoint
            const res = await api.get(`/specialties/${context.id}/progress?userId=${member.id}`);
            return res.data;
        },
        enabled: isOpen && !!member.id && !!context.id
    });

    const userProgress = fetchedProgress || initialUserRequirements || [];


    const approveMutation = useMutation({
        mutationFn: async () => {
            if (context.type === 'SPECIALTY') {
                return api.post(`/specialties/award/${member.id}/${context.id}`);
            }
            // Class awarding not supported here yet
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-specialties'] });
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
            alert(`Aprovação registrada!`);
            onClose();
        },
        onError: (err) => {
            console.error(err);
            alert('Erro ao aprovar.');
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ reqId, status }: { reqId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING' }) => {
            return api.post(`/specialties/requirement/${member.id}/${reqId}/${status}`);
        },
        onSuccess: async () => {
            await refetch(); // Explicitly refetch to update UI immediately
            queryClient.invalidateQueries({ queryKey: ['admin-review'] }); // old key
            queryClient.invalidateQueries({ queryKey: ['user-progress'] }); // new key
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['users'] }); // Refresh leaderboard/members list
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] }); // Refresh explicit leaderboard if exists
            // Invalidate passed props if needed? Parent query 'pending-approvals' will update.
        },
        onError: (err) => {
            console.error("Erro ao atualizar status", err);
            alert('Erro ao atualizar status do requisito.');
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Avaliar: {context.title}</h2>
                        <p className="text-sm text-slate-500">
                            Candidato: <span className="font-semibold text-slate-700">{member.name}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${context.type === 'SPECIALTY' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {context.type === 'SPECIALTY' ? <FileText className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-700">{context.title}</h3>
                            <p className="text-xs text-slate-500">{requirements.length} Requisitos</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {Object.entries(
                            requirements.reduce((acc, req) => {
                                const area = req.area || 'I.GERAIS';
                                if (!acc[area]) acc[area] = [];
                                acc[area].push(req);
                                return acc;
                            }, {} as Record<string, typeof requirements>)
                        ).map(([area, areaReqs]) => (
                            <div key={area} className="space-y-4">
                                <h4 className="font-semibold text-slate-600 border-b border-slate-100 pb-2">{area}</h4>
                                {areaReqs.map((req, index) => {
                                    const answer = userProgress?.find((up) => up.requirementId === req.id);
                                    const hasAnswer = !!answer;
                                    const isApproved = answer?.status === 'APPROVED';
                                    const isPending = answer?.status === 'PENDING';
                                    const isRejected = answer?.status === 'REJECTED';

                                    let cardStyle = 'border-slate-200 bg-white';
                                    let badgeStyle = 'bg-slate-100 text-slate-500';
                                    let textStyle = 'text-slate-800';

                                    if (isApproved) {
                                        cardStyle = 'bg-green-50 border-green-200';
                                        badgeStyle = 'bg-green-100 text-green-600';
                                        textStyle = 'text-green-800';
                                    } else if (isPending) {
                                        cardStyle = 'bg-yellow-50 border-yellow-200';
                                        badgeStyle = 'bg-yellow-100 text-yellow-600';
                                        textStyle = 'text-yellow-800';
                                    } else if (isRejected) {
                                        cardStyle = 'bg-red-50 border-red-200';
                                        badgeStyle = 'bg-red-100 text-red-600';
                                        textStyle = 'text-red-800';
                                    }

                                    return (
                                        <div key={req.id} className={`border rounded-xl p-4 transition-colors ${cardStyle}`}>
                                            <div className="flex gap-3">
                                                <div className="mt-1">
                                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${badgeStyle}`}>
                                                        {isApproved ? <CheckCircle className="w-4 h-4" /> : (req.code || index + 1)}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium mb-2 ${textStyle}`}>{req.description}</p>

                                                    {/* User Answer Display */}
                                                    {hasAnswer ? (
                                                        <div className="bg-white/50 p-3 rounded-lg border border-slate-100">
                                                            {req.type === 'TEXT' ? (
                                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                                    {answer.answerText || <em className="text-slate-400">Validado Manualmente</em>}
                                                                </p>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <a
                                                                        href={answer.answerFileUrl || '#'}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                                    >
                                                                        <Download className="w-4 h-4" />
                                                                        Baixar/Visualizar Arquivo
                                                                    </a>
                                                                </div>
                                                            )}
                                                            <div className="mt-2 text-xs text-slate-400 flex justify-between">
                                                                <span className={
                                                                    answer.status === 'APPROVED' ? 'text-green-600 font-bold' :
                                                                        answer.status === 'REJECTED' ? 'text-red-600 font-bold' :
                                                                            'text-yellow-600 font-bold'
                                                                }>
                                                                    Status: {answer.status === 'PENDING' ? 'Pendente' : answer.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-400 italic p-2">
                                                            Sem resposta registrada.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Evaluation Controls */}
                                            <div className="mt-3 flex gap-2 justify-end border-t pt-2">
                                                <button
                                                    onClick={() => updateStatusMutation.mutate({ reqId: req.id, status: 'REJECTED' })}
                                                    className={`text-xs px-2 py-1 rounded border transition-colors ${answer?.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-red-600'}`}
                                                    title={hasAnswer ? "Solicitar Correção (Refazer)" : "Marcar como Não Cumprido"}
                                                    disabled={updateStatusMutation.isPending}
                                                >
                                                    {hasAnswer ? 'Refazer' : 'Rejeitar'}
                                                </button>
                                                <button
                                                    onClick={() => updateStatusMutation.mutate({ reqId: req.id, status: 'APPROVED' })}
                                                    className={`text-xs px-2 py-1 rounded border transition-colors ${answer?.status === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-200 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-green-600'}`}
                                                    title="Aprovar Requisito"
                                                    disabled={updateStatusMutation.isPending}
                                                >
                                                    Aprovado
                                                </button>

                                                {/* Revoke Button (only if approved) */}
                                                {isApproved && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Tem certeza que deseja revogar esta aprovação? O status voltará para Pendente.')) {
                                                                updateStatusMutation.mutate({ reqId: req.id, status: 'PENDING' });
                                                            }
                                                        }}
                                                        className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                                                        title="Revogar Aprovação (Voltar para Pendente)"
                                                        disabled={updateStatusMutation.isPending}
                                                    >
                                                        Revogar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    {context.type === 'SPECIALTY' && (
                        <button
                            onClick={() => approveMutation.mutate()}
                            disabled={approveMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Aprovar Especialidade
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
