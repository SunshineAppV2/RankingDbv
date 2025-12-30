import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Plus, TrendingUp, TrendingDown, DollarSign, Building2, Globe, MapPin, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { SimpleLineChart, CashFlowChart } from '../components/Charts';

// Firestore Imports
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface MasterTransaction {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    category: string;
    date: string;
    sourceClubId?: string;
    sourceClub?: {
        name: string;
        region: string;
        mission: string;
        union: string;
    };
}

export function MasterTreasury() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Auth Check
    if (user?.email !== 'master@cantinhodbv.com' && user?.role !== 'MASTER') {
        return <div className="p-8 text-center text-red-500">Acesso Restrito ao Master.</div>;
    }

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [sourceClubId, setSourceClubId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterClubId, setFilterClubId] = useState('');

    // Queries
    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs-dashboard'],
        queryFn: async () => {
            const snaps = await getDocs(collection(db, 'clubs'));
            return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        staleTime: 5 * 60 * 1000
    });

    const { data: transactions = [] } = useQuery<MasterTransaction[]>({
        queryKey: ['master-transactions', startDate, endDate, filterClubId],
        queryFn: async () => {
            let q = query(collection(db, 'master_transactions'));

            if (filterClubId) {
                q = query(q, where('sourceClubId', '==', filterClubId));
            }

            // Note: Range filters on different fields usually require composite index.
            // Client-side filtering for date is safer for now if dataset is small.
            // Otherwise we need 'date' index.

            const snapshot = await getDocs(q);
            let data = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const t = docSnap.data() as any;
                let sourceClub = undefined;
                if (t.sourceClubId) {
                    // Optimally we'd have a clubs map, but fetching single doc is ok if list small
                    // Better: use the 'clubs' list we already fetched if available?
                    // But clubs might not be loaded yet or this query runs parallel.
                    // Let's rely on stored club data if we denormalize, but we didn't.
                    // Fallback: Fetch club doc
                    const cSnap = await getDoc(doc(db, 'clubs', t.sourceClubId));
                    if (cSnap.exists()) {
                        sourceClub = cSnap.data();
                    }
                }

                return {
                    id: docSnap.id,
                    ...t,
                    sourceClub
                } as MasterTransaction;
            }));

            // Client-side Filter Date
            if (startDate) {
                data = data.filter(t => t.date >= startDate);
            }
            if (endDate) {
                data = data.filter(t => t.date <= endDate);
            }

            // Sort by Date Desc
            return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
    });

    const summary = useMemo(() => {
        let income = 0;
        let expense = 0;

        // Prepare Monthly Data map
        const monthlyMap = new Map<string, { name: string, income: number, expense: number }>();
        // Local map for aggregation

        // Sort asc for evolution
        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;

        sorted.forEach(t => {
            // Overall Summary
            if (t.type === 'INCOME') income += t.amount;
            else expense += t.amount;

            // Monthly Data
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

            if (!monthlyMap.has(key)) {
                monthlyMap.set(key, { name: monthName, income: 0, expense: 0 });
            }
            const monthData = monthlyMap.get(key)!;

            if (t.type === 'INCOME') {
                monthData.income += t.amount;
                runningBalance += t.amount;
            } else {
                monthData.expense += t.amount;
                runningBalance -= t.amount;
            }

            // Capture balance at this transaction date (simplified: daily/transactional)
            // For line chart, we might want daily or monthly points. Let's do monthly end state or just all points?
            // All points might be too noisy. Let's do Monthly End Balance properly.
            // Or simpler: Cumulative Balance line for each transaction?
            // "Balance Evolution" usually implies time series.
            // Let's stick to Monthly Balance for consistency with the bar chart?
            // Or "Cash on Hand" curve.
            // Let's just push every transaction point for detailed view? No, too heavy.
            // Monthly Aggregation is cleaner.
        });

        const monthlyData = Array.from(monthlyMap.values());

        // Calculate cumulative balance for each month to chart "Evolution"
        let cumulative = 0;
        const evolutionData = monthlyData.map(m => {
            cumulative += (m.income - m.expense);
            return {
                name: m.name,
                balance: cumulative
            };
        });

        return {
            income,
            expense,
            balance: income - expense,
            monthlyData,
            evolutionData
        };
    }, [transactions]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            await addDoc(collection(db, 'master_transactions'), data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['master-transactions'] });
            setIsModalOpen(false);
            resetForm();
            toast.success('Transação criada.');
        },
        onError: () => toast.error('Erro ao criar transação.')
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteDoc(doc(db, 'master_transactions', id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['master-transactions'] });
            toast.success('Transação excluída.');
        },
        onError: () => toast.error('Erro ao excluir.')
    });

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setCategory('');
        setSourceClubId('');
        setDate(new Date().toISOString().split('T')[0]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            type,
            amount: Number(amount),
            description,
            category,
            sourceClubId: sourceClubId || null,
            date,
            createdAt: new Date().toISOString()
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tesouraria Master</h1>
                    <p className="text-slate-500">Gestão financeira da plataforma (Recebimentos e Custos)</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Nova Transação
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Saldo Total</p>
                            <h3 className={`text-2xl font-bold ${(summary.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {summary.balance.toFixed(2)}
                            </h3>
                        </div>
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><DollarSign className="w-6 h-6" /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Receitas</p>
                            <h3 className="text-2xl font-bold text-green-600">+ R$ {summary.income.toFixed(2)}</h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg text-green-600"><TrendingUp className="w-6 h-6" /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Despesas</p>
                            <h3 className="text-2xl font-bold text-red-600">- R$ {summary.expense.toFixed(2)}</h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg text-red-600"><TrendingDown className="w-6 h-6" /></div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CashFlowChart
                    title="Fluxo de Caixa Mensal"
                    data={summary.monthlyData}
                    dataKeyName="name"
                    dataKeyIncome="income"
                    dataKeyExpense="expense"
                />
                <SimpleLineChart
                    title="Evolução do Saldo"
                    data={summary.evolutionData}
                    dataKeyName="name"
                    dataKeyValue="balance"
                />
            </div>



            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Período</label>
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
                        <span className="text-slate-400">até</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Filtrar por Clube</label>
                    <select value={filterClubId} onChange={e => setFilterClubId(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-48">
                        <option value="">Todos</option>
                        {clubs.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase">
                        <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Clube / Origem</th>
                            <th className="px-6 py-3">Localização (U/M/R)</th>
                            <th className="px-6 py-3">Descrição (Cat.)</th>
                            <th className="px-6 py-3 text-right">Valor</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transactions.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum registro.</td></tr>
                        ) : transactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3 text-slate-600">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="px-6 py-3 font-medium">
                                    {t.sourceClub ? (
                                        <div className="flex items-center gap-1">
                                            <Building2 className="w-4 h-4 text-blue-500" />
                                            {t.sourceClub.name}
                                        </div>
                                    ) : <span className="text-slate-400 italic">Geral / Sem Clube</span>}
                                </td>
                                <td className="px-6 py-3 text-slate-500 text-xs">
                                    {t.sourceClub ? (
                                        <div className="flex flex-col">
                                            <span><Globe className="w-3 h-3 inline mr-1" />{t.sourceClub.union || '-'}</span>
                                            <span><MapPin className="w-3 h-3 inline mr-1" />{t.sourceClub.mission} / {t.sourceClub.region}</span>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-3">
                                    <div className="text-slate-800">{t.description}</div>
                                    <div className="text-xs text-slate-400">{t.category}</div>
                                </td>
                                <td className={`px-6 py-3 text-right font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'INCOME' ? '+ ' : '- '}
                                    R$ {t.amount.toFixed(2)}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(t.id) }} className="p-2 text-slate-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Transação Master">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4">
                        <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-2 rounded-lg border font-bold ${type === 'INCOME' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600'}`}>Entrada</button>
                        <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-2 rounded-lg border font-bold ${type === 'EXPENSE' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600'}`}>Saída</button>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Valor (R$)</label>
                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full border rounded px-3 py-2" placeholder="0.00" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="w-full border rounded px-3 py-2" placeholder="Ex: Mensalidade de Licença" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                        <input type="text" value={category} onChange={e => setCategory(e.target.value)} required list="cats" className="w-full border rounded px-3 py-2" placeholder="Ex: Licença Anual" />
                        <datalist id="cats">
                            <option value="Licença Anual" />
                            <option value="Mensalidade" />
                            <option value="Inscrição / Taxa de Adesão" />
                            <option value="Doação" />
                            <option value="Servidor" />
                            <option value="Dev" />
                        </datalist>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Clube (Opcional)</label>
                        <select value={sourceClubId} onChange={e => setSourceClubId(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                            <option value="">-- Geral / Nenhum --</option>
                            {clubs.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name} ({c.region})</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Selecione o clube pagador para identificar a origem.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Data</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full border rounded px-3 py-2" />
                    </div>

                    <button type="submit" disabled={createMutation.isPending} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mt-4">
                        {createMutation.isPending ? 'Salvando...' : 'Salvar Transação'}
                    </button>
                </form>
            </Modal>
        </div>
    );
}
