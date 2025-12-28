import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { generateMedicalFile } from '../lib/pdf-generator';
import { Modal } from './Modal';
import { User, Heart, Home, Users, FileText } from 'lucide-react';
// import { Combobox } from './Combobox';

interface SecretaryMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    initialData: any;
}

export function SecretaryMemberModal({ isOpen, onClose, memberId, initialData }: SecretaryMemberModalProps) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'PERSONAL' | 'HEALTH' | 'FAMILY' | 'ADDRESS'>('PERSONAL');
    const [formData, setFormData] = useState(initialData);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    const { data: units = [] } = useQuery({
        queryKey: ['club-units', initialData?.clubId],
        queryFn: async () => {
            if (!initialData?.clubId) return [];
            const res = await api.get(`/units/club/${initialData.clubId}`);
            return res.data;
        },
        enabled: !!initialData?.clubId
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            // Strip complex objects before sending
            const { club, unit, requirements, classProgress, ...cleanData } = data;
            return api.patch(`/users/${memberId}`, cleanData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['secretary-members'] });
            queryClient.invalidateQueries({ queryKey: ['unit-ranking'] });
            queryClient.invalidateQueries({ queryKey: ['units'] });
            alert('Dados atualizados com sucesso!');
            onClose();
        },
        onError: (error: any) => {
            alert('Erro ao atualizar: ' + (error.response?.data?.message || error.message));
        }
    });

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        updateMutation.mutate(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Editar: ${initialData.name}`} maxWidth="max-w-4xl">
            <div className="flex flex-col h-[70vh]">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200 mb-4 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('PERSONAL')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                            ${activeTab === 'PERSONAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <User className="w-4 h-4" /> Dados Pessoais
                    </button>
                    <button
                        onClick={() => setActiveTab('HEALTH')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                            ${activeTab === 'HEALTH' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Heart className="w-4 h-4" /> Ficha Médica
                    </button>
                    <button
                        onClick={() => setActiveTab('FAMILY')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                            ${activeTab === 'FAMILY' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users className="w-4 h-4" /> Família
                    </button>
                    <button
                        onClick={() => setActiveTab('ADDRESS')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                            ${activeTab === 'ADDRESS' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Home className="w-4 h-4" /> Endereço
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">

                    {/* PERSONAL TAB */}
                    {activeTab === 'PERSONAL' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                                <input type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-slate-50" disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                                <input type="text" value={formData.cpf || ''} onChange={e => handleChange('cpf', e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="000.000.000-00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                                <input type="text" value={formData.rg || ''} onChange={e => handleChange('rg', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Órgão Emissor</label>
                                <input type="text" value={formData.issuingOrg || ''} onChange={e => handleChange('issuingOrg', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                                <input type="date" value={formData.birthDate ? new Date(formData.birthDate).toISOString().split('T')[0] : ''} onChange={e => handleChange('birthDate', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
                                <select value={formData.sex || ''} onChange={e => handleChange('sex', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                                    <option value="">Selecione</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Feminino</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tamanho da Camiseta</label>
                                <select value={formData.shirtSize || ''} onChange={e => handleChange('shirtSize', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                                    <option value="">Selecione</option>
                                    <option value="PP">PP</option>
                                    <option value="P">P</option>
                                    <option value="M">M</option>
                                    <option value="G">G</option>
                                    <option value="GG">GG</option>
                                    <option value="XG">XG</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Celular / WhatsApp</label>
                                <input type="text" value={formData.mobile || ''} onChange={e => handleChange('mobile', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                                <select
                                    value={formData.unitId || ''}
                                    onChange={e => handleChange('unitId', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="">Sem Unidade</option>
                                    {units.map((unit: any) => (
                                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* HEALTH TAB */}
                    {activeTab === 'HEALTH' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Sanguíneo</label>
                                    <select value={formData.bloodType || ''} onChange={e => handleChange('bloodType', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="">Selecione</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="AB">AB</option>
                                        <option value="O">O</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fator RH</label>
                                    <select value={formData.rhFactor || ''} onChange={e => handleChange('rhFactor', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="">Selecione</option>
                                        <option value="+">Positivo (+)</option>
                                        <option value="-">Negativo (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cartão SUS</label>
                                    <input type="text" value={formData.susNumber || ''} onChange={e => handleChange('susNumber', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Plano de Saúde</label>
                                    <input type="text" value={formData.healthPlan || ''} onChange={e => handleChange('healthPlan', e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Nome do convênio" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Alergias (Alimentos, Medicamentos, etc.)</label>
                                <textarea
                                    value={formData.specificAllergies || ''}
                                    onChange={e => handleChange('specificAllergies', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg h-20"
                                    placeholder="Ex: Penicilina, Amendoim..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Medicamentos de Uso Contínuo</label>
                                <textarea
                                    value={formData.regularMedications || ''}
                                    onChange={e => handleChange('regularMedications', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg h-20"
                                    placeholder="Ex: Insulina, Ritalina..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={formData.hasDiabetes || false} onChange={e => handleChange('hasDiabetes', e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                                    <span className="text-sm font-medium text-slate-700">Diabetes</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={formData.hasHeartProblem || false} onChange={e => handleChange('hasHeartProblem', e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                                    <span className="text-sm font-medium text-slate-700">Problemas Cardíacos</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* FAMILY TAB */}
                    {activeTab === 'FAMILY' && (
                        <div className="space-y-4">
                            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                <h4 className="text-sm font-bold text-red-800 mb-2">Contato de Emergência</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-red-700 mb-1">Nome</label>
                                        <input type="text" value={formData.emergencyName || ''} onChange={e => handleChange('emergencyName', e.target.value)} className="w-full px-3 py-2 border border-red-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-red-700 mb-1">Telefone</label>
                                        <input type="text" value={formData.emergencyPhone || ''} onChange={e => handleChange('emergencyPhone', e.target.value)} className="w-full px-3 py-2 border border-red-200 rounded-lg" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Pai</label>
                                    <input type="text" value={formData.fatherName || ''} onChange={e => handleChange('fatherName', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone do Pai</label>
                                    <input type="text" value={formData.fatherPhone || ''} onChange={e => handleChange('fatherPhone', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Mãe</label>
                                    <input type="text" value={formData.motherName || ''} onChange={e => handleChange('motherName', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone da Mãe</label>
                                    <input type="text" value={formData.motherPhone || ''} onChange={e => handleChange('motherPhone', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ADDRESS TAB */}
                    {activeTab === 'ADDRESS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                                <input type="text" value={formData.cep || ''} onChange={e => handleChange('cep', e.target.value)} className="w-40 px-3 py-2 border rounded-lg" placeholder="00000-000" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rua / Logradouro</label>
                                <input type="text" value={formData.address || ''} onChange={e => handleChange('address', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                                <input type="text" value={formData.addressNumber || ''} onChange={e => handleChange('addressNumber', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                                <input type="text" value={formData.neighborhood || ''} onChange={e => handleChange('neighborhood', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                                <input type="text" value={formData.city || ''} onChange={e => handleChange('city', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
                                <input type="text" value={formData.state || ''} onChange={e => handleChange('state', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                                <input type="text" value={formData.complement || ''} onChange={e => handleChange('complement', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="border-t border-slate-200 pt-4 mt-auto flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => generateMedicalFile(formData, 'Clube de Desbravadores')}
                        className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1"
                    >
                        <FileText className="w-4 h-4" /> Gerar PDF (Ficha)
                    </button>

                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                        >
                            {updateMutation.isPending ? 'Salvando...' : 'Salvar Dados'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
