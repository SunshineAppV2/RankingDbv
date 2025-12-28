
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { ListChecks, User, FileText, Check, X } from 'lucide-react';
import { forwardRef } from 'react';

export const PendingApprovalsList = forwardRef<HTMLDivElement>((_props, ref) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: pendingApprovals = [], refetch, error } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            if (!user?.clubId) return [];
            // Fetch submissions waiting for approval
            const q = query(collection(db, 'submissions'), where('clubId', '==', user.clubId), where('status', '==', 'WAITING_APPROVAL'));
            const snapshot = await getDocs(q);

            // Manual Join
            const approvals = await Promise.all(snapshot.docs.map(async (d) => {
                const data = d.data();
                // Fetch User
                const userSnap = await getDoc(doc(db, 'users', data.userId));
                const userData = userSnap.exists() ? userSnap.data() : { name: 'Usuário Desconhecido' };

                // Fetch Requirement
                const reqSnap = await getDoc(doc(db, 'requirements', data.requirementId));
                const reqData = reqSnap.exists() ? reqSnap.data() : { code: 'REQ', description: 'Requisito' };

                return {
                    id: d.id,
                    ...data,
                    user: userData,
                    requirement: reqData
                };
            }));
            return approvals;
        },
        enabled: ['COUNSELOR', 'ADMIN', 'OWNER', 'INSTRUCTOR'].includes(user?.role || ''),
        retry: false
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            await updateDoc(doc(db, 'submissions', id), { status: 'COMPLETED', completedAt: new Date().toISOString() });
        },
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
        },
        onError: () => alert('Erro ao aprovar.')
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            await updateDoc(doc(db, 'submissions', id), { status: 'PENDING' }); // Revert to PENDING so user can try again
        },
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
        },
        onError: () => alert('Erro ao rejeitar.')
    });

    if (error || !Array.isArray(pendingApprovals) || pendingApprovals.length === 0) return null;

    return (
        <div ref={ref} className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Aguardando Aprovação ({pendingApprovals.length})
            </h2>
            <div className="grid gap-4">
                {pendingApprovals.map((item: any) => {
                    if (!item?.user || !item?.requirement) return null;
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    {item.user.photoUrl ? (
                                        <img src={item.user.photoUrl} alt="User" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-slate-500" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{item.user.name}</p>
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold text-slate-900">
                                            {item.requirement.area ? `${item.requirement.area} - ` : ''}
                                            {item.requirement.code} - {item.requirement.description}
                                        </span>
                                    </div>
                                    {item.answerText && (
                                        <p className="mt-2 text-sm bg-slate-50 p-2 rounded text-slate-700 italic border border-slate-100">"{item.answerText}"</p>
                                    )}
                                    {item.answerFileUrl && (
                                        <a href={item.answerFileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                                            <FileText className="w-4 h-4" /> Ver Anexo
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => { if (window.confirm('Aprovar?')) approveMutation.mutate(item.id) }} className="bg-green-100 text-green-700 p-2 rounded hover:bg-green-200 gap-2 flex items-center text-sm font-bold">
                                    <Check className="w-4 h-4" /> Aprovar
                                </button>
                                <button onClick={() => { if (window.confirm('Rejeitar?')) rejectMutation.mutate(item.id) }} className="bg-red-100 text-red-700 p-2 rounded hover:bg-red-200 gap-2 flex items-center text-sm font-bold">
                                    <X className="w-4 h-4" /> Rejeitar
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
});

export function PendingDeliveriesList() {
    const { user } = useAuth();
    const { data: pendingDeliveries = [], error } = useQuery({
        queryKey: ['pending-deliveries'],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const q = query(collection(db, 'submissions'), where('clubId', '==', user.clubId), where('status', '==', 'PENDING'));
            const snapshot = await getDocs(q);

            const deliveries = await Promise.all(snapshot.docs.map(async (d) => {
                const data = d.data();
                // Fetch User
                const userSnap = await getDoc(doc(db, 'users', data.userId));
                const userData = userSnap.exists() ? userSnap.data() : { name: 'Usuário Desconhecido' };

                // Fetch Requirement
                const reqSnap = await getDoc(doc(db, 'requirements', data.requirementId));
                const reqData = reqSnap.exists() ? reqSnap.data() : { code: 'REQ', description: 'Requisito' };

                return {
                    id: d.id,
                    ...data,
                    user: userData,
                    requirement: reqData
                };
            }));
            return deliveries;
        },
        enabled: ['COUNSELOR', 'ADMIN', 'OWNER', 'INSTRUCTOR'].includes(user?.role || ''),
        retry: false
    });

    if (error || !Array.isArray(pendingDeliveries) || pendingDeliveries.length === 0) return null;

    const getDaysPending = (dateString: any) => {
        try {
            if (!dateString) return "?";
            const created = new Date(dateString);
            if (isNaN(created.getTime())) return "?";
            const diffTime = Math.abs(new Date().getTime() - created.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch { return "?"; }
    };

    return (
        <div className="mb-8 mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pendentes de Entrega ({pendingDeliveries.length})
            </h2>
            <div className="grid gap-4">
                {pendingDeliveries.map((item: any) => {
                    const days = getDaysPending(item.assignedAt || item.createdAt);
                    if (!item?.user || !item?.requirement) return null;
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-100 flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    {item.user.photoUrl ? <img src={item.user.photoUrl} className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5 text-slate-500" />}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{item.user.name}</p>
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold text-slate-900">
                                            {item.requirement.code ? `${item.requirement.code} - ` : ''}
                                            {item.requirement.description}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${days !== '?' && Number(days) > 7 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                    PENDENTE HÁ {days} DIAS
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
