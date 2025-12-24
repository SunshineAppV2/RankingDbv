import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, Upload, Check, Clock, AlertCircle, FileText } from 'lucide-react';
import { Modal } from '../components/Modal';

interface Transaction {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    category: string;
    date: string;
    status: 'PENDING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'CANCELED';
    proofUrl?: string;
    dueDate?: string;
}

export function FinancialDashboard() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedTx, setSelectedTx] = useState<string | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);

    const getDaysLabel = (dateStr?: string) => {
        if (!dateStr) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dateStr);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return <div className="text-red-600 font-bold text-[10px] mt-0.5">Vencido há {Math.abs(diffDays)} dias</div>;
        if (diffDays === 0) return <div className="text-orange-600 font-bold text-[10px] mt-0.5">Vence hoje</div>;
        return <div className="text-slate-500 text-[10px] mt-0.5">Vence em {diffDays} dias</div>;
    };

    const { data: transactions = [] } = useQuery<Transaction[]>({
        queryKey: ['my-finances', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const response = await api.get(`/treasury/user/${user.id}`);
            return response.data;
        },
        enabled: !!user?.id
    });

    const payMutation = useMutation({
        mutationFn: async ({ id, file }: { id: string, file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.post(`/treasury/${id}/pay`, formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-finances'] });
            setSelectedTx(null);
            setProofFile(null);
            alert('Pagamento informado com sucesso! Aguarde a validação.');
        }
    });

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTx && proofFile) {
            payMutation.mutate({ id: selectedTx, file: proofFile });
        } else {
            alert('Por favor, anexe o comprovante.');
        }
    };

    const pendingAmount = transactions
        .filter(t => t.status === 'PENDING' && t.type === 'INCOME') // Income for club = Expense for user
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-2">
                    <DollarSign className="w-10 h-10 text-emerald-200" />
                    <div>
                        <h1 className="text-3xl font-bold">Minhas Finanças</h1>
                        <p className="text-emerald-100">Acompanhe seus pagamentos e mensalidades</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-slate-500 font-medium mb-2">Total a Pagar</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-800">R$ {pendingAmount.toFixed(2)}</span>
                        {pendingAmount > 0 && <span className="text-sm text-red-500 font-medium">(Pendente)</span>}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 font-bold text-slate-700">
                    Histórico
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-3">Vencimento</th>
                                <th className="px-6 py-3">Descrição</th>
                                <th className="px-6 py-3">Categoria</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Valor</th>
                                <th className="px-6 py-3 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {transactions.map(t => {
                                const isOverdue = t.status === 'PENDING' && t.dueDate && new Date() > new Date(t.dueDate);
                                let rowClass = 'hover:bg-slate-50';
                                if (t.status === 'COMPLETED') rowClass = 'bg-green-50 hover:bg-green-100';
                                else if (isOverdue) rowClass = 'bg-red-50 hover:bg-red-100';
                                else if (t.status === 'PENDING') rowClass = 'bg-orange-50 hover:bg-orange-100';

                                return (
                                    <tr key={t.id} className={`transition-colors border-b border-slate-200 ${rowClass}`}>
                                        <td className="px-6 py-3 text-slate-600">
                                            {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : new Date(t.date).toLocaleDateString()}
                                            {t.status === 'PENDING' && getDaysLabel(t.dueDate)}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-slate-800">{t.description}</td>
                                        <td className="px-6 py-3">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`flex items-center gap-1 text-xs font-bold uppercase ${t.status === 'COMPLETED' ? 'text-green-600' :
                                                t.status === 'WAITING_APPROVAL' ? 'text-yellow-600' :
                                                    t.status === 'PENDING' ? 'text-red-600' : 'text-slate-400'
                                                }`}>
                                                {t.status === 'COMPLETED' && <Check className="w-3 h-3" />}
                                                {t.status === 'WAITING_APPROVAL' && <Clock className="w-3 h-3" />}
                                                {t.status === 'PENDING' && <AlertCircle className="w-3 h-3" />}
                                                {t.status === 'COMPLETED' ? 'Pago' :
                                                    t.status === 'WAITING_APPROVAL' ? 'Em Análise' :
                                                        t.status === 'PENDING' ? 'Pendente' : 'Cancelado'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-slate-700">
                                            R$ {t.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {t.status === 'PENDING' ? (
                                                <button
                                                    onClick={() => setSelectedTx(t.id)}
                                                    className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 mx-auto"
                                                >
                                                    <Upload className="w-3 h-3" /> Pagar
                                                </button>
                                            ) : t.status === 'WAITING_APPROVAL' ? (
                                                <span className="text-xs text-slate-400 italic">Aguardando</span>
                                            ) : t.proofUrl ? (
                                                <a href={t.proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center justify-center gap-1">
                                                    <FileText className="w-3 h-3" /> Ver Comp.
                                                </a>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>

                                    </tr>
                                );
                            })}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        Nenhum registro financeiro encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} title="Informar Pagamento">
                <form onSubmit={handlePayment} className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                        <h4 className="font-bold text-blue-800 mb-2">Dados para Pagamento (PIX)</h4>
                        <p className="text-sm text-blue-700 mb-1">Chave PIX (CNPJ): <span className="font-mono font-bold select-all">00.000.000/0001-00</span></p>
                        <p className="text-sm text-blue-700">Tesouraria Clube Master</p>
                        <p className="text-xs text-blue-500 mt-2">Faça a transferência e anexe o comprovante abaixo.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Comprovante (PDF ou Imagem)</label>
                        <input
                            type="file"
                            required
                            accept=".pdf,image/*"
                            onChange={e => setProofFile(e.target.files?.[0] || null)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Anexe o comprovante da transferência.</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setSelectedTx(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button
                            type="submit"
                            disabled={payMutation.isPending}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50"
                        >
                            {payMutation.isPending ? 'Enviando...' : 'Confirmar Pagamento'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
