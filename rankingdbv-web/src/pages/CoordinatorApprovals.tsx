
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Check, X, User as UserIcon, FileText, ExternalLink } from 'lucide-react';
import { api } from '../lib/axios';
import { toast } from 'sonner';

interface PendingRequirement {
    id: string;
    requirementId: string;
    userId: string;
    status: string;
    answerText?: string;
    answerFileUrl?: string;
    requirement: {
        description: string;
        code?: string;
    };
    user: {
        name: string;
        club: {
            name: string;
        }
    }
}

export const CoordinatorApprovals: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: pending = [], isLoading } = useQuery<PendingRequirement[]>({
        queryKey: ['coordinator-pending-approvals'],
        queryFn: async () => {
            const res = await api.get('/requirements/approvals/pending');
            return res.data;
        }
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => api.patch(`/requirements/progress/${id}`, { status: 'APPROVED' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coordinator-pending-approvals'] });
            toast.success('Requisito aprovado!');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => api.patch(`/requirements/progress/${id}`, { status: 'REJECTED' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coordinator-pending-approvals'] });
            toast.success('Requisito rejeitado.');
        }
    });

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Carregando intervenções...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <ShieldAlert className="text-orange-500 w-8 h-8" />
                    Intervenções de Coordenação
                </h1>
                <p className="text-slate-500 mt-1">Aprovação de requisitos em nível regional/distrital.</p>
            </header>

            {pending.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Tudo em dia!</h2>
                    <p className="text-slate-500">Não há requisitos pendentes que necessitem de intervenção no momento.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {pending.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-orange-200 transition-colors">
                            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                                        <UserIcon className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-800">{item.user.name}</h3>
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                                {item.user.club.name}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 mt-1">
                                            {item.requirement.code && <span className="text-indigo-600 mr-1">[{item.requirement.code}]</span>}
                                            {item.requirement.description}
                                        </p>

                                        {item.answerText && (
                                            <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                                "{item.answerText}"
                                            </div>
                                        )}

                                        {item.answerFileUrl && (
                                            <a
                                                href={item.answerFileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-2 inline-flex items-center gap-2 text-sm text-indigo-600 font-bold hover:underline"
                                            >
                                                <FileText className="w-4 h-4" />
                                                Ver Arquivo Anexo
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-auto">
                                    <button
                                        onClick={() => rejectMutation.mutate(item.id)}
                                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        title="Rejeitar"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={() => approveMutation.mutate(item.id)}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-sm flex items-center gap-2"
                                    >
                                        <Check className="w-5 h-5" />
                                        Aprovar Intervenção
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
