import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { Modal } from './Modal';
import { toast } from 'sonner';

interface Club {
    id: string;
    name: string;
    planTier?: string;
    subscriptionStatus?: string;
    memberLimit?: number;
    nextBillingDate?: string;
    gracePeriodDays?: number;
}

interface ClubSubscriptionModalProps {
    club: Club;
    onClose: () => void;
    onSave: () => void;
}

export function ClubSubscriptionModal({ club, onClose, onSave }: ClubSubscriptionModalProps) {
    const [formData, setFormData] = useState({
        planTier: 'TRIAL',
        memberLimit: 30,
        subscriptionStatus: 'TRIAL',
        nextBillingDate: '',
        gracePeriodDays: 5
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (club) {
            // Fetch fresh status to be sure
            api.get(`/clubs/${club.id}`).then(res => {
                const data = res.data;
                setFormData({
                    planTier: data.planTier || 'TRIAL',
                    memberLimit: data.memberLimit || 30,
                    subscriptionStatus: data.subscriptionStatus || 'TRIAL',
                    nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate).toISOString().split('T')[0] : '',
                    gracePeriodDays: data.gracePeriodDays || 5
                });
            }).catch(() => toast.error('Erro ao carregar dados do clube'));
        }
    }, [club]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.patch(`/clubs/${club.id}/subscription`, formData);
            toast.success('Assinatura atualizada com sucesso!');
            onSave();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao atualizar assinatura.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Gerenciar Assinatura: ${club.name}`}
        >
            <div className="space-y-4">
                {/* Plan Tier */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plano</label>
                    <select
                        value={formData.planTier}
                        onChange={e => setFormData({ ...formData, planTier: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                    >
                        <option value="TRIAL">Trial (Testes)</option>
                        <option value="FREE">Gratuito (Limitado)</option>
                        <option value="PLAN_P">Plano P (Até 30)</option>
                        <option value="PLAN_M">Plano M (Até 80)</option>
                        <option value="PLAN_G">Plano G (Líder - Ilimitado)</option>
                    </select>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status Financeiro</label>
                    <select
                        value={formData.subscriptionStatus}
                        onChange={e => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                    >
                        <option value="TRIAL">Trial</option>
                        <option value="ACTIVE">Ativo (Em dia)</option>
                        <option value="OVERDUE">Vencido (Bloqueia novos membros)</option>
                        <option value="CANCELED">Cancelado (Bloqueio Total)</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Member Limit */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Limite Membros</label>
                        <input
                            type="number"
                            value={formData.memberLimit}
                            onChange={e => setFormData({ ...formData, memberLimit: Number(e.target.value) })}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </div>
                    {/* Grace Period */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Carência (Dias)</label>
                        <input
                            type="number"
                            value={formData.gracePeriodDays}
                            onChange={e => setFormData({ ...formData, gracePeriodDays: Number(e.target.value) })}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </div>
                </div>

                {/* Next Billing Date */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Próximo Vencimento</label>
                    <input
                        type="date"
                        value={formData.nextBillingDate}
                        onChange={e => setFormData({ ...formData, nextBillingDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                    />
                     <div className="flex gap-2 mt-2">
                        <button 
                            className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200"
                            onClick={() => {
                                const d = new Date();
                                d.setMonth(d.getMonth() + 1);
                                setFormData({ ...formData, nextBillingDate: d.toISOString().split('T')[0] });
                            }}
                        >
                            +30 Dias
                        </button>
                        <button 
                            className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200"
                            onClick={() => {
                                const d = new Date();
                                d.setFullYear(d.getFullYear() + 1);
                                setFormData({ ...formData, nextBillingDate: d.toISOString().split('T')[0] });
                            }}
                        >
                            +1 Ano
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
