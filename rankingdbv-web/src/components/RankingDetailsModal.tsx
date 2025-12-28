import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Calendar, Award, FileText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text(`Histórico de Pontos: ${userName}`, 14, 20);

        doc.setFontSize(10);
        doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 28);

        let totalPoints = 0;
        const tableData = logs.map(log => {
            totalPoints += Number(log.amount);
            const date = format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR });

            // Re-use logic for cleaner source label
            const sourceKey = log.source.toUpperCase();
            let sourceLabel = sourceKey;

            if (sourceKey === 'REQUIREMENT') {
                if (log.reason.toLowerCase().includes('classe')) sourceLabel = 'Classe';
                else sourceLabel = 'Requisito';
            } else {
                const map: Record<string, string> = {
                    'ACTIVITY': 'Atividade do Clube',
                    'PURCHASE': 'Financeiro',
                    'MANUAL': 'Manual',
                    'MANUAL_ADJUSTMENT': 'Ajuste Manual',
                    'ATTENDANCE': 'Presença',
                    'EVENT': 'Evento',
                    'SPECIALTY': 'Especialidade'
                };
                if (map[sourceKey]) sourceLabel = map[sourceKey];
            }

            return [
                date,
                log.reason,
                sourceLabel,
                log.amount > 0 ? `+${log.amount}` : `${log.amount}`
            ];
        });

        autoTable(doc, {
            startY: 35,
            head: [['Data', 'Descrição', 'Origem', 'Pontos']],
            body: tableData,
            foot: [['', '', 'TOTAL', totalPoints > 0 ? `+${totalPoints}` : `${totalPoints}`]],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // Blue-500
            footStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' }, // Slate-100, Slate-700
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 'auto' }, // Desc
                2: { cellWidth: 30 }, // Origem
                3: { cellWidth: 20, halign: 'right' }
            }
        });

        doc.save(`historico-pontos-${userName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
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
                        <div className="flex gap-4 items-center">
                            <span className="font-semibold">Total de Registros:</span>
                            <span className="font-bold">{logs.length}</span>
                        </div>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
                        >
                            <FileText className="w-4 h-4" />
                            Exportar PDF
                        </button>
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
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-700">{log.reason}</div>
                                            <div className="text-[10px] text-slate-400 italic uppercase tracking-wider mt-0.5">
                                                {(() => {
                                                    const source = log.source.toUpperCase();

                                                    // Special Logic for Requirements (Class vs Requirement)
                                                    if (source === 'REQUIREMENT') {
                                                        if (log.reason.toLowerCase().includes('classe')) return 'Classe';
                                                        return 'Requisito';
                                                    }

                                                    const map: Record<string, string> = {
                                                        'ACTIVITY': 'Atividade do Clube',
                                                        'PURCHASE': 'Financeiro',
                                                        'MANUAL': 'Manual',
                                                        'MANUAL_ADJUSTMENT': 'Ajuste Manual',
                                                        'ATTENDANCE': 'Presença',
                                                        'EVENT': 'Evento',
                                                        'SPECIALTY': 'Especialidade'
                                                    };
                                                    return map[source] || source;
                                                })()}
                                            </div>
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
