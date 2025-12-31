
import { useState, useEffect } from 'react';
import { Check, Copy, AlertTriangle, CreditCard, User, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/axios';

export function SubscriptionPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await api.get('/clubs/status');
            setStats(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar status do clube.');
        } finally {
            setLoading(false);
        }
    };

    const PLANS = [
        {
            id: 'BASIC',
            name: 'Básico',
            range: 'Até 20 usuários',
            limit: 20,
            price: 'R$ 19,90',
            features: ['Até 20 usuários ativos', 'Suporte Básico', 'Atualizações Gratuitas']
        },
        {
            id: 'BRONZE',
            name: 'Bronze',
            range: '21 a 30 usuários',
            limit: 30,
            price: 'R$ 29,90',
            features: ['Até 30 usuários ativos', 'Suporte Prioritário', 'Gestão Financeira']
        },
        {
            id: 'SILVER',
            name: 'Prata',
            range: '31 a 100 usuários',
            limit: 100,
            price: 'R$ 39,90',
            features: ['Até 100 usuários ativos', 'Suporte VIP', 'Relatórios Avançados']
        },
        {
            id: 'GOLD',
            name: 'Ouro',
            range: 'Acima de 100 usuários',
            limit: 9999,
            price: 'R$ 59,90',
            features: ['Usuários Ilimitados', 'Consultoria Exclusiva', 'Tudo Incluso']
        }
    ];

    // Determine current plan based on total members
    const totalMembers = stats?.totalMembers || 0;
    const currentPlan = PLANS.find(p => totalMembers <= p.limit) || PLANS[PLANS.length - 1];

    const PIX_KEY = "financeiro@cantinhodbv.com"; // Placeholder

    const copyPix = () => {
        navigator.clipboard.writeText(PIX_KEY);
        toast.success('Chave PIX copiada!');
    };

    const handleContact = () => {
        const message = `Olá, meu clube tem ${totalMembers} membros ativos e estou na faixa ${currentPlan.name} (${currentPlan.price}). Gostaria de regularizar a assinatura via PIX.`;
        window.open(`https://wa.me/5561999999999?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (loading) return <div className="p-8 text-center">Carregando informações...</div>;

    // Progress Calculation
    const usagePercent = Math.min(100, (totalMembers / currentPlan.limit) * 100);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">

            {/* Header / Status */}
            <div className={`border-l-4 rounded-r-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm ${stats?.subscriptionStatus === 'ACTIVE' ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'}`}>
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        {stats?.subscriptionStatus === 'ACTIVE' ? (
                            <div className="bg-green-100 p-2 rounded-full text-green-600"><Check className="w-6 h-6" /></div>
                        ) : (
                            <div className="bg-orange-100 p-2 rounded-full text-orange-600"><AlertTriangle className="w-6 h-6" /></div>
                        )}
                        <h1 className={`text-2xl font-bold ${stats?.subscriptionStatus === 'ACTIVE' ? 'text-green-800' : 'text-orange-800'}`}>
                            {stats?.subscriptionStatus === 'ACTIVE' ? 'Assinatura Ativa' : 'Regularize sua Assinatura'}
                        </h1>
                    </div>
                    <p className="text-slate-600 max-w-2xl">
                        A cobrança é ajustada automaticamente conforme o crescimento do seu clube. Mantenha sua assinatura em dia para garantir o acesso de todos os membros.
                    </p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 min-w-[250px]">
                    <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                        <span className="flex items-center gap-1"><User className="w-4 h-4" /> Usuários Ativos</span>
                        <span className="font-bold text-slate-800">{totalMembers} / {currentPlan.limit === 9999 ? '∞' : currentPlan.limit}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${usagePercent}%` }}></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-blue-600 font-medium">Plano Atual: {currentPlan.name}</p>
                </div>
            </div>

            {/* Plans Grid */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                    Tabela de Planos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {PLANS.map(plan => {
                        const isCurrent = plan.id === currentPlan.id;
                        return (
                            <div
                                key={plan.id}
                                className={`border-2 rounded-2xl p-6 transition-all relative flex flex-col ${isCurrent
                                    ? 'border-blue-600 bg-blue-50/50 shadow-lg scale-[1.02] z-10'
                                    : 'border-slate-200 bg-white hover:border-blue-200'
                                    }`}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                        SEU PLANO ATUAL
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-slate-700 text-center">{plan.name}</h3>
                                <p className="text-sm text-center text-slate-500 mb-4">{plan.range}</p>

                                <div className="text-center mb-6">
                                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                                    <span className="text-sm text-slate-500">/mês</span>
                                </div>

                                <ul className="space-y-3 mb-6 flex-1">
                                    {plan.features.map((feat, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>

                                <div className={`mt-auto text-center text-xs font-medium py-2 rounded-lg ${isCurrent ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {isCurrent ? 'Ativo' : (totalMembers > plan.limit ? 'Capacidade Excedida' : 'Disponível')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <CreditCard className="w-6 h-6 text-indigo-600" />
                    Pagamento via PIX
                </h2>

                <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    {/* Fake QR Code */}
                    <div className="bg-slate-100 p-4 rounded-xl shrink-0">
                        {/* In real app, generate QR Code from payload string */}
                        <div className="w-40 h-40 bg-white flex flex-col items-center justify-center border border-slate-200 text-slate-400 gap-2">
                            <CreditCard className="w-8 h-8 opacity-20" />
                            <span className="text-xs">QR CODE ESTÁTICO</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 w-full">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-sm text-blue-800 font-medium mb-1">Valor a Pagar:</p>
                            <p className="text-3xl font-bold text-blue-900">{currentPlan.price}</p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500 mb-1">Chave PIX (E-mail)</p>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                                <code className="flex-1 font-mono text-slate-700 truncate">{PIX_KEY}</code>
                                <button onClick={copyPix} className="text-slate-400 hover:text-blue-600 transition-colors p-2">
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600">
                            Após realizar o pagamento no valor de <strong>{currentPlan.price}</strong>, envie o comprovante para liberarmos/renovarmos seu acesso.
                        </p>

                        <button
                            onClick={handleContact}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM16.53 14.84C16.28 14.71 15.07 14.12 14.84 14.03C14.62 13.95 14.45 13.91 14.29 14.16C14.12 14.41 13.65 14.97 13.51 15.13C13.37 15.29 13.23 15.31 12.98 15.19C12.73 15.06 11.93 14.8 10.98 13.95C10.25 13.3 9.75 12.5 9.5 12.08C9.25 11.66 9.47 11.43 9.6 11.31C9.71 11.2 9.85 11.02 9.97 10.88C10.09 10.74 10.14 10.63 10.22 10.47C10.3 10.3 10.26 10.15 10.2 10.03C10.14 9.91 9.67 8.75 9.47 8.28C9.28 7.82 9.08 7.89 8.94 7.89C8.8 7.88 8.64 7.88 8.48 7.88C8.32 7.88 8.05 7.94 7.83 8.18C7.6 8.42 6.96 9.02 6.96 10.24C6.96 11.46 7.85 12.64 7.97 12.81C8.1 12.98 9.73 15.49 12.22 16.57C14.71 17.65 14.71 17.29 15.16 17.25C15.61 17.21 16.61 16.66 16.82 16.07C17.03 15.48 17.03 14.97 16.97 14.88C16.91 14.78 16.74 14.74 16.53 14.61V14.84Z" />
                            </svg>
                            Enviar Comprovante de Pagamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
