import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Download, Shield, Database, Save, Server, CreditCard, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { AccessControlEditor } from '../components/AccessControlEditor';

export function Settings() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [downloading, setDownloading] = useState(false);

    // Club Edit State
    const [clubName, setClubName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');

    const { data: clubData, isLoading: clubLoading } = useQuery({
        queryKey: ['club-settings', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return null;
            const res = await api.get(`/clubs/${user.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId
    });

    useEffect(() => {
        if (clubData) {
            setClubName(clubData.name || '');
            setLogoUrl(clubData.logoUrl || '');
        }
    }, [clubData]);

    const updateClubMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            await api.put(`/clubs/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['club-settings'] });
            /* Invalidate user to refresh logo in header if needed, strictly speaking user->club relation might not refresh user query immediately */
            toast.success('Dados do clube atualizados!');
        },
        onError: () => toast.error('Erro ao atualizar clube.')
    });

    const exportMutation = useMutation({
        mutationFn: async () => {
            setDownloading(true);
            try {
                const response = await api.get('/clubs/export/all');
                return response.data;
            } finally {
                setDownloading(false);
            }
        },
        onSuccess: (data) => {
            // Trigger JSON download
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-clube-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('Backup realizado com sucesso!');
        },
        onError: () => {
            alert('Erro ao realizar backup. Tente novamente.');
        }
    });

    if (!['OWNER', 'ADMIN'].includes(user?.role || '')) {
        return <div className="p-8 text-center text-slate-500">Acesso restrito a administradores.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Configurações & Sistema</h1>
                <p className="text-slate-500">Gerencie dados do clube, backups e configurações gerais.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Master Only: Subscription Management Link */}
                {(user?.email === 'master@cantinhodbv.com' || user?.role === 'MASTER') && (
                    <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-xl shadow-lg text-white flex items-center justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-1">Gerenciar Assinaturas (Master)</h3>
                            <p className="text-blue-100 text-sm max-w-lg">
                                Acesse o painel de hierarquia para criar novos clubes, gerenciar licenças e assinaturas.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/dashboard/hierarchy'}
                            className="relative z-10 bg-white text-blue-600 px-6 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-sm"
                        >
                            Acessar Gerenciador
                        </button>
                        {/* Decorative Circle */}
                        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                    </div>
                )}

                {/* Backup Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                        <Database className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Exportar Dados (Backup)</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Baixe um arquivo JSON contendo todos os dados do seu clube: membros, transações, eventos e histórico.
                        Útil para segurança ou migrações.
                    </p>
                    <button
                        onClick={() => exportMutation.mutate()}
                        disabled={downloading}
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-3 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        {downloading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                        {downloading ? 'Gerando Arquivo...' : 'Baixar Backup Completo'}
                    </button>
                    <p className="text-xs text-slate-400 mt-3 text-center">
                        Formato: JSON • Tamanho estimado: Variável
                    </p>
                </div>

                {/* Club Data Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-4">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Dados do Clube</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Alterar informações de identificação do clube.
                    </p>

                    {clubLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-10 bg-slate-100 rounded w-full"></div>
                            <div className="h-10 bg-slate-100 rounded w-full"></div>
                        </div>
                    ) : (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (clubData && user?.clubId) updateClubMutation.mutate({ id: user.clubId, data: { name: clubName, logoUrl } });
                        }} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Clube</label>
                                <input
                                    type="text"
                                    value={clubName}
                                    onChange={(e) => setClubName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="Nome do Clube"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL do Logo</label>
                                <input
                                    type="text"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="https://..."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={updateClubMutation.isPending}
                                className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-3 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {updateClubMutation.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                Salvar Alterações
                            </button>
                        </form>
                    )}
                </div>
                {/* Access Control Card (ACL) */}
                <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Controle de Acessos (Menus)</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Defina quais perfis podem acessar cada módulo do sistema. O Diretor/Admin sempre tem acesso total.
                    </p>

                    <AccessControlEditor clubData={clubData} onSave={(perms) => {
                        if (user?.clubId) {
                            // Merge with existing settings to avoid data loss
                            const currentSettings = clubData.settings || {};
                            updateClubMutation.mutate({
                                id: user.clubId,
                                data: {
                                    settings: {
                                        ...currentSettings,
                                        permissions: perms
                                    }
                                }
                            });
                        }
                    }} isPending={updateClubMutation.isPending} />
                </div>

                {/* --- Master Section: Payment Gateway Control --- */}
                {(user?.email === 'master@cantinhodbv.com' || user?.role === 'MASTER') && (
                    <MasterPaymentsConfig />
                )}

                {/* --- Director Section: Subscription Status & Checkout --- */}
                {['OWNER', 'DIRECTOR'].includes(user?.role || '') && (
                    <DirectorSubscription club={clubData} />
                )}

            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <Server className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <h4 className="font-bold text-blue-800 text-sm">Status do Sistema</h4>
                    <p className="text-xs text-blue-600 mt-1">
                        Versão: 1.0.0 (Beta) <br />
                        Ambiente: {import.meta.env.MODE}
                    </p>
                </div>
            </div>
        </div>
    );
}

function MasterPaymentsConfig() {
    const queryClient = useQueryClient();
    const { data: settings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: async () => {
            const res = await api.get('/payments/public-settings');
            return res.data;
        }
    });

    const isEnabled = settings?.mercadopago_enabled === true;

    const toggleMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            await api.patch('/payments/settings/mercadopago_enabled', { value: enabled });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public-settings'] });
            toast.success('Configuração de pagamentos atualizada!');
        }
    });

    const setupPlansMutation = useMutation({
        mutationFn: async () => {
            const promise = api.post('/payments/setup-plans');
            toast.promise(promise, {
                loading: 'Criando planos no Mercado Pago...',
                success: 'Planos configurados!',
                error: 'Erro ao configurar planos.'
            });
            await promise;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public-settings'] });
        }
    });

    return (
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Pagamentos Mercado Pago (Master)</h3>
                        <p className="text-xs text-slate-500">Ative ou desative a cobrança automática via Mercado Pago.</p>
                    </div>
                </div>
                <button
                    onClick={() => toggleMutation.mutate(!isEnabled)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${isEnabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    {isEnabled ? 'Ativado' : 'Desativado'}
                </button>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => setupPlansMutation.mutate()}
                    className="flex-1 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                    Reinicializar Planos (MP)
                </button>
            </div>
        </div>
    );
}

function DirectorSubscription({ club }: { club: any }) {
    const { data: settings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: async () => {
            const res = await api.get('/payments/public-settings');
            return res.data;
        }
    });

    if (!settings?.mercadopago_enabled) return null;

    const plans = [
        { name: 'Mensal', price: '39,90', id: settings.mercadopago_plan_ids?.find((p: any) => p.key === 'plano_mensal')?.id },
        { name: 'Trimestral', price: '109,90', id: settings.mercadopago_plan_ids?.find((p: any) => p.key === 'plano_trimestral')?.id },
        { name: 'Anual', price: '399,90', id: settings.mercadopago_plan_ids?.find((p: any) => p.key === 'plano_anual')?.id },
    ];

    return (
        <div className="md:col-span-2 bg-slate-900 text-white p-6 rounded-xl shadow-xl overflow-hidden relative">
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Plano de Assinatura</span>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold mb-1">Mantenha seu clube ativo</h3>
                        <p className="text-slate-400 text-sm max-w-md">Escolha um dos planos abaixo para liberar todas as funcionalidades e garantir o acesso da sua diretoria.</p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                                STATUS: {club?.subscriptionStatus || 'TRIAL'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {plans.map(plan => (
                            <button
                                key={plan.name}
                                onClick={() => {
                                    if (plan.id) {
                                        window.open(`https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${plan.id}`, '_blank');
                                    } else {
                                        toast.error('ID do plano não configurado.');
                                    }
                                }}
                                className="bg-white text-slate-900 px-4 py-3 rounded-xl flex flex-col items-center hover:scale-105 transition-transform shadow-lg min-w-[120px]"
                            >
                                <span className="text-[10px] font-bold uppercase text-slate-500">{plan.name}</span>
                                <span className="text-lg font-black text-blue-600">R$ {plan.price}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Visual Background Element */}
            <div className="absolute right-0 bottom-0 opacity-10">
                <CreditCard className="w-64 h-64 -mb-20 -mr-20 rotate-12" />
            </div>
        </div>
    );
}

