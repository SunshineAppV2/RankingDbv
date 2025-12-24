
import { useQuery, useQueries } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, User, Calendar, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ParentAlerts() {
    const { user } = useAuth();

    // 1. Fetch Children
    const { data: children = [], isLoading: isLoadingChildren } = useQuery({
        queryKey: ['children', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const response = await api.get(`/users/family/children/${user.id}`);
            return response.data;
        },
        enabled: !!user?.id
    });

    // 2. Fetch Alerts for EACH child
    const alertsQueries = useQueries({
        queries: children.map((child: any) => ({
            queryKey: ['child-alerts', child.id],
            queryFn: async () => {
                const response = await api.get(`/requirements/child/${child.id}/alerts`);
                return response.data.map((alert: any) => ({ ...alert, child })); // Attach child info
            },
            enabled: !!child.id
        }))
    });

    const isLoadingAlerts = alertsQueries.some(q => q.isLoading);

    // Flatten alerts
    const allAlerts = alertsQueries
        .flatMap(q => q.data || [])
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (isLoadingChildren || isLoadingAlerts) {
        return <div className="p-8 text-center text-slate-500">Carregando alertas...</div>;
    }

    if (allAlerts.length === 0) {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-center bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                    <Clock className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Tudo em dia!</h2>
                <p className="text-slate-500 mt-2">Nenhuma pendência ou alerta para seus filhos no momento.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                Alertas
            </h1>

            <div className="grid gap-4">
                {allAlerts.map((alert: any) => (
                    <div key={alert.id} className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden"
                        style={{ borderLeftColor: alert.status === 'REJECTED' ? '#ef4444' : '#eab308' }}
                    >
                        <div className="flex items-start gap-4">
                            {/* Child Info */}
                            <div className="flex flex-col items-center gap-1 shrink-0 min-w-[80px]">
                                {alert.child.photoUrl ? (
                                    <img src={alert.child.photoUrl} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                        <User className="w-6 h-6" />
                                    </div>
                                )}
                                <span className="text-xs font-bold text-slate-600 text-center leading-tight">{alert.child.name.split(' ')[0]}</span>
                            </div>

                            {/* Alert Content */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-slate-800 text-lg">
                                        {alert.requirement.area && (
                                            <span className="text-blue-600 text-xs font-extrabold uppercase mr-2 tracking-wider">
                                                {alert.requirement.area}
                                            </span>
                                        )}
                                        {alert.requirement.code}
                                    </h3>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${alert.status === 'REJECTED'
                                        ? 'bg-red-50 text-red-600 border-red-100'
                                        : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                                        }`}>
                                        {alert.status === 'REJECTED' ? 'Recusado' : 'Pendente'}
                                    </span>
                                </div>

                                <p className="text-slate-700 text-sm mt-1 mb-2 line-clamp-2">{alert.requirement.description}</p>

                                <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-50 pt-2 mt-2">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(alert.updatedAt), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                    </span>
                                    {alert.status === 'REJECTED' && (
                                        <span className="text-red-500 font-semibold flex items-center gap-1">
                                            <XCircle className="w-3 h-3" />
                                            Requer atenção
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
