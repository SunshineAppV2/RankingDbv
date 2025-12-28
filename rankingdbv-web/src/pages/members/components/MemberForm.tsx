
import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { INITIAL_FORM_DATA, ROLE_TRANSLATIONS } from '../types';
import type { Member, Unit } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

interface MemberFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Member | null;
    units: Unit[];
    clubs: any[];
    members: Member[];
}

export function MemberForm({ isOpen, onClose, onSubmit, initialData, units, clubs, members }: MemberFormProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('basic');
    const [formData, setFormData] = useState<any>(INITIAL_FORM_DATA);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...INITIAL_FORM_DATA,
                    ...initialData,
                    password: '',
                    childrenIds: initialData.children?.map(c => c.id) || []
                });
            } else {
                setFormData({ ...INITIAL_FORM_DATA, clubId: user?.clubId || '' });
            }
        }
    }, [isOpen, initialData, user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const CLASSES = ['AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Membro' : 'Novo Membro'}>
            <div className="flex border-b mb-4 overflow-x-auto gap-2">
                {['basic', 'personal', 'address', 'family', 'education', 'health'].map(tab => (
                    <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-3 py-2 text-sm whitespace-nowrap capitalize ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
                        {tab === 'basic' ? 'Básico' :
                            tab === 'personal' ? 'Pessoal' :
                                tab === 'address' ? 'Endereço' :
                                    tab === 'family' ? 'Família' :
                                        tab === 'education' ? 'Escola' : 'Saúde'}
                    </button>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                {/* Basic Tab */}
                {activeTab === 'basic' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: João Silva" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Ex: joao@email.com" type="email" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>

                        {user?.email === 'master@cantinhodbv.com' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Clube (Apenas Master)</label>
                                <select
                                    value={formData.clubId || ''}
                                    onChange={e => setFormData({ ...formData, clubId: e.target.value })}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="">Selecione o Clube</option>
                                    {Array.from(new Map(clubs.map((c: any) => [c.name, c])).values()).map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {!initialData && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Senha Inicial</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>
                        )}
                        {initialData && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha (Opcional)</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Deixe em branco para manter"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    minLength={6}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo / Função</label>
                            <select
                                value={formData.role}
                                onChange={e => {
                                    const newRole = e.target.value;
                                    setFormData({
                                        ...formData,
                                        role: newRole,
                                        isActive: ['PARENT', 'COUNSELOR'].includes(newRole) ? false : formData.isActive
                                    });
                                }}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                {Object.entries(ROLE_TRANSLATIONS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {formData.role === 'PARENT' && (
                            <div className="border p-3 rounded bg-blue-50 my-2">
                                <label className="block text-sm font-bold text-blue-800 mb-2">Associar Filhos (Desbravadores)</label>
                                <div className="max-h-40 overflow-y-auto bg-white border rounded">
                                    {members?.filter(m => {
                                        if (m.role !== 'PATHFINDER') return false;
                                        // Allow if not associated OR associated with THIS user
                                        return (!m.parentId || (initialData && m.parentId === initialData.id));
                                    }).map(m => (
                                        <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 border-b last:border-0 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.childrenIds?.includes(m.id)}
                                                onChange={e => {
                                                    const current = formData.childrenIds || [];
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, childrenIds: [...current, m.id] });
                                                    } else {
                                                        setFormData({ ...formData, childrenIds: current.filter((id: string) => id !== m.id) });
                                                    }
                                                }}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <span className="text-sm text-gray-700">{m.name}</span>
                                        </label>
                                    ))}
                                    {(!members || members.filter(m => m.role === 'PATHFINDER' && (!m.parentId || (initialData && m.parentId === initialData.id))).length === 0) && (
                                        <div className="p-3 text-sm text-gray-500 text-center">Nenhum desbravador disponível.</div>
                                    )}
                                </div>
                                <p className="text-xs text-blue-600 mt-1">Selecione os desbravadores que são filhos deste responsável. Apenas desbravadores sem pais vinculados aparecem aqui.</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                            <select value={formData.unitId} onChange={e => setFormData({ ...formData, unitId: e.target.value })} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="">Sem Unidade</option>
                                {units.sort((a, b) => a.name.localeCompare(b.name)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
                            <select value={formData.dbvClass} onChange={e => setFormData({ ...formData, dbvClass: e.target.value })} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="">Sem Classe</option>
                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                                Participa do Ranking? (Ativo)
                            </label>
                        </div>
                    </>
                )}

                {/* Personal Tab */}
                {activeTab === 'personal' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Nascimento</label>
                            <input type="date" value={formData.birthDate ? new Date(formData.birthDate).toISOString().split('T')[0] : ''} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
                            <select value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })} className="w-full p-2 border rounded">
                                <option value="M">Masculino</option>
                                <option value="F">Feminino</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                            <input value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} className="w-full p-2 border rounded" placeholder="000.000.000-00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                            <input value={formData.rg} onChange={e => setFormData({ ...formData, rg: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Órgão Emissor</label>
                            <input value={formData.issuingOrg} onChange={e => setFormData({ ...formData, issuingOrg: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Estado Civil</label>
                            <select value={formData.maritalStatus} onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })} className="w-full p-2 border rounded">
                                <option value="SOLTEIRO">Solteiro(a)</option>
                                <option value="CASADO">Casado(a)</option>
                                <option value="DIVORCIADO">Divorciado(a)</option>
                                <option value="VIUVO">Viúvo(a)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tamanho Camisa</label>
                            <input value={formData.shirtSize} onChange={e => setFormData({ ...formData, shirtSize: e.target.value })} className="w-full p-2 border rounded" placeholder="Ex: M, G, 14" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Celular (WhatsApp)</label>
                            <input value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} className="w-full p-2 border rounded" placeholder="(00) 00000-0000" />
                        </div>
                    </div>
                )}

                {/* Address Tab */}
                {activeTab === 'address' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                            <input value={formData.cep} onChange={e => setFormData({ ...formData, cep: e.target.value })} className="w-full p-2 border rounded" placeholder="00000-000" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço (Rua, Av.)</label>
                            <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                            <input value={formData.addressNumber} onChange={e => setFormData({ ...formData, addressNumber: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                            <input value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                            <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
                            <input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="w-full p-2 border rounded" maxLength={2} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                            <input value={formData.complement} onChange={e => setFormData({ ...formData, complement: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                )}

                {/* Family Tab */}
                {activeTab === 'family' && (
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 border-b pb-1">Filiação</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Pai</label>
                                <input value={formData.fatherName} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Pai</label>
                                <input value={formData.fatherPhone} onChange={e => setFormData({ ...formData, fatherPhone: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Mãe</label>
                                <input value={formData.motherName} onChange={e => setFormData({ ...formData, motherName: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Mãe</label>
                                <input value={formData.motherPhone} onChange={e => setFormData({ ...formData, motherPhone: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                        </div>

                        <h4 className="font-bold text-slate-800 border-b pb-1 pt-4">Contato de Emergência</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Contato</label>
                                <input value={formData.emergencyName} onChange={e => setFormData({ ...formData, emergencyName: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                                <input value={formData.emergencyPhone} onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Parentesco</label>
                                <input value={formData.emergencyRelation} onChange={e => setFormData({ ...formData, emergencyRelation: e.target.value })} className="w-full p-2 border rounded" placeholder="Ex: Tio, Vizinho" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Education Tab */}
                {activeTab === 'education' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Escolaridade</label>
                            <select value={formData.educationLevel} onChange={e => setFormData({ ...formData, educationLevel: e.target.value })} className="w-full p-2 border rounded">
                                <option value="">Selecione...</option>
                                <option value="FUNDAMENTAL_INCOMPLETO">Fundamental Incompleto</option>
                                <option value="FUNDAMENTAL_COMPLETO">Fundamental Completo</option>
                                <option value="MEDIO_INCOMPLETO">Médio Incompleto</option>
                                <option value="MEDIO_COMPLETO">Médio Completo</option>
                                <option value="SUPERIOR_INCOMPLETO">Superior Incompleto</option>
                                <option value="SUPERIOR_COMPLETO">Superior Completo</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Escola / Instituição</label>
                            <input value={formData.institution} onChange={e => setFormData({ ...formData, institution: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Turno</label>
                            <select value={formData.schoolShift} onChange={e => setFormData({ ...formData, schoolShift: e.target.value })} className="w-full p-2 border rounded">
                                <option value="">Selecione...</option>
                                <option value="MATUTINO">Matutino</option>
                                <option value="VESPERTINO">Vespertino</option>
                                <option value="NOTURNO">Noturno</option>
                                <option value="INTEGRAL">Integral</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Health Tab */}
                {activeTab === 'health' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cartão SUS</label>
                                <input value={formData.susNumber} onChange={e => setFormData({ ...formData, susNumber: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Sanguíneo</label>
                                <div className="flex gap-2">
                                    <select value={formData.bloodType} onChange={e => setFormData({ ...formData, bloodType: e.target.value })} className="w-2/3 p-2 border rounded">
                                        <option value="">Tipo</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="AB">AB</option>
                                        <option value="O">O</option>
                                    </select>
                                    <select value={formData.rhFactor} onChange={e => setFormData({ ...formData, rhFactor: e.target.value })} className="w-1/3 p-2 border rounded">
                                        <option value="">RH</option>
                                        <option value="+">+</option>
                                        <option value="-">-</option>
                                    </select>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Plano de Saúde</label>
                                <input value={formData.healthPlan} onChange={e => setFormData({ ...formData, healthPlan: e.target.value })} className="w-full p-2 border rounded" placeholder="Nome do plano e número" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Condições de Saúde</label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" checked={formData.hasDiabetes} onChange={e => setFormData({ ...formData, hasDiabetes: e.target.checked })} className="text-blue-600 rounded" />
                                    Diabetes
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" checked={formData.hasHeartProblem} onChange={e => setFormData({ ...formData, hasHeartProblem: e.target.checked })} className="text-blue-600 rounded" />
                                    Problemas Cardíacos
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" checked={formData.hasRenalProblem} onChange={e => setFormData({ ...formData, hasRenalProblem: e.target.checked })} className="text-blue-600 rounded" />
                                    Problemas Renais
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" checked={formData.hasPsychProblem} onChange={e => setFormData({ ...formData, hasPsychProblem: e.target.checked })} className="text-blue-600 rounded" />
                                    Acompanhamento Psicológico
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Alergias</label>
                            <textarea value={formData.specificAllergies} onChange={e => setFormData({ ...formData, specificAllergies: e.target.value })} className="w-full p-2 border rounded" rows={2} placeholder="Alergia a medicamentos, alimentos, picadas..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Medicamentos Contínuos</label>
                            <textarea value={formData.regularMedications} onChange={e => setFormData({ ...formData, regularMedications: e.target.value })} className="w-full p-2 border rounded" rows={2} placeholder="Lista de medicamentos..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Observações Médicas Adicionais</label>
                            <textarea value={formData.healthNotes} onChange={e => setFormData({ ...formData, healthNotes: e.target.value })} className="w-full p-2 border rounded" rows={3} />
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                </div>
            </form>
        </Modal>
    );
}
