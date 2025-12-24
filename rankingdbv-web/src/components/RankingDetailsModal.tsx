import { useEffect, useState } from 'react';
import { Modal } from './Modal'; // Adjust import if Modal is default
import { api } from '../lib/axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Calendar, Award } from 'lucide-react';
import { toast } from 'sonner';

interface RankingDetailsModalProps {
    userId: string | null;
    userName: string;
    isOpen: boolean;
    onClose: () => void;
}

interface ActivityLog {
    id: string;
    createdAt: string;
    amount: number;
    reason: string;
    source: string;
}

export function RankingDetailsModal({ userId, userName, isOpen, onClose }: RankingDetailsModalProps) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            fetchLogs();
        }
    }, [isOpen, userId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/activities/user/${userId}/logs`);
            setLogs(response.data);
        } catch (error) {
            console.error('Erro ao buscar detalhes:', error);
            toast.error('Não foi possível carregar o histórico de pontos.');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Histórico de Pontos: ${userName}`} maxWidth="max-w-2xl">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-500">Carregando histórico...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    Nenhum registro de pontos encontrado para este usuário.
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center text-blue-900 border border-blue-100">
                        <span className="font-semibold">Total de Registros:</span>
                        <span className="font-bold">{logs.length}</span>
                    </div>

                    <div className="overflow-hidden border border-slate-100 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Atividade</th>
                                    <th className="px-4 py-3 text-right">Pontos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {format(new Date(log.createdAt), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            {log.reason}
                                            <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 lowercase">{log.source}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${log.amount >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {log.amount > 0 ? '+' : ''}{log.amount} <Award className="w-3 h-3" />
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Modal>
    );
}
