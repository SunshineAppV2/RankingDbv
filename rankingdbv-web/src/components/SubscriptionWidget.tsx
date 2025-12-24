import { useEffect, useState } from 'react';
import { api } from '../lib/axios';
import { CreditCard, Users, AlertTriangle } from 'lucide-react';

interface ClubStatus {
    planTier: string;
    memberLimit: number;
    activeMembers: number;
    subscriptionStatus: 'ACTIVE' | 'OVERDUE' | 'CANCELED' | 'TRIAL';
    nextBillingDate: string | null;
}

export function SubscriptionWidget() {
    const [status, setStatus] = useState<ClubStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/clubs/status')
            .then(res => setStatus(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading || !status) return null;

    const usagePercent = Math.min(100, Math.round((status.activeMembers / status.memberLimit) * 100));
    
    // Status Logic
    const isOverdue = status.subscriptionStatus === 'OVERDUE' || status.subscriptionStatus === 'CANCELED';
    const isWarning = usagePercent >= 90;

    const getPlanName = (tier: string) => {
        switch(tier) {
            case 'PLAN_P': return 'Plano P (Pequeno)';
            case 'PLAN_M': return 'Plano M (Padrão)';
            case 'PLAN_G': return 'Plano G (Líder)';
            case 'FREE': return 'Plano Gratuito';
            case 'TRIAL': return 'Período de Testes';
            default: return tier;
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    return (
        <div className={`rounded-xl shadow-sm border p-4 mb-6 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">{getPlanName(status.planTier)}</h3>
                        <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                            {isOverdue ? '⚠️ ASSINATURA VENCIDA' : `Vencimento: ${formatDate(status.nextBillingDate)}`}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                   {isOverdue && (
                       <button className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                           REGULARIZAR
                       </button>
                   )}
                </div>
            </div>

            {/* Usage Bar */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Membros Ativos</span>
                    <span className={isWarning || isOverdue ? 'text-red-600' : 'text-green-600'}>
                        {status.activeMembers} / {status.memberLimit}
                    </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            isOverdue ? 'bg-red-400' :
                            isWarning ? 'bg-yellow-400' : 'bg-green-500'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                    ></div>
                </div>
                {isWarning && !isOverdue && (
                   <p className="text-[10px] text-yellow-700 mt-1 flex items-center gap-1">
                       <AlertTriangle className="w-3 h-3" /> Lotação próxima do limite. Considere um upgrade.
                   </p>
                )}
            </div>
        </div>
    );
}
