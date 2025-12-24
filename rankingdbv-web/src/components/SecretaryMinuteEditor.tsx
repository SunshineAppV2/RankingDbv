import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { toast } from 'sonner';
import { X, Save, Calendar, FileText, Tag, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

interface Minute {
    id?: string;
    title: string;
    type: string;
    date: string;
    content: string;
    attendeeIds?: string[];
}

interface SecretaryMinuteEditorProps {
    initialData?: Minute | null;
    onClose: () => void;
    onSave: () => void;
}

export function SecretaryMinuteEditor({ initialData, onClose, onSave }: SecretaryMinuteEditorProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Minute>({
        title: '',
        type: 'ATA_REGULAR',
        date: new Date().toISOString().split('T')[0],
        content: '',
        attendeeIds: []
    });

    const { data: members = [], isLoading: isLoadingMembers } = useQuery({
        queryKey: ['secretary-members', user?.clubId],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data;
        },
        enabled: !!user?.clubId
    });

    useEffect(() => {
        if (initialData) {
            // Map attendees object array to simple ID array for the form
            // Check if 'attendees' exists (from backend relation) or 'attendeeIds' (if passed manually)
            const mappedAttendeeIds = (initialData as any).attendees
                ? (initialData as any).attendees.map((a: any) => a.userId || a.user?.id)
                : (initialData.attendeeIds || []);

            setFormData({
                ...initialData,
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                attendeeIds: mappedAttendeeIds
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        // ... (existing submit logic)
        e.preventDefault();
        setLoading(true);

        try {
            if (initialData?.id) {
                await api.patch(`/secretary/minutes/${initialData.id}`, formData);
                toast.success('Ata atualizada com sucesso!');
            } else {
                await api.post('/secretary/minutes', formData);
                toast.success('Ata criada com sucesso!');
            }
            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar ata.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {initialData ? 'Editar Ata' : 'Nova Ata'}
                        </h2>
                        <p className="text-sm text-slate-500">Preencha os dados da reunião ou ato administrativo.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Category Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">Categoria do Registro</label>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`
                                flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all
                                ${formData.type.startsWith('ATA')
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'}
                            `}>
                                <input
                                    type="radio"
                                    name="category"
                                    className="hidden"
                                    checked={formData.type.startsWith('ATA')}
                                    onChange={() => setFormData({ ...formData, type: 'ATA_REGULAR' })}
                                />
                                <div className="text-center">
                                    <div className="font-black text-lg uppercase tracking-wider">ATA</div>
                                    <div className="text-xs opacity-75 font-medium">Reuniões</div>
                                </div>
                            </label>

                            <label className={`
                                flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all
                                ${formData.type.startsWith('ATO')
                                    ? 'border-orange-600 bg-orange-50 text-orange-700'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'}
                            `}>
                                <input
                                    type="radio"
                                    name="category"
                                    className="hidden"
                                    checked={formData.type.startsWith('ATO')}
                                    onChange={() => setFormData({ ...formData, type: 'ATO_OUTROS' })}
                                />
                                <div className="text-center">
                                    <div className="font-black text-lg uppercase tracking-wider">ATO</div>
                                    <div className="text-xs opacity-75 font-medium">Decisões Adm.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                Título
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder={formData.type.startsWith('ATA') ? "Ex: Reunião Regular 001/2025" : "Ex: Nomeação de Conselheiros"}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                Data
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-slate-400" />
                            Tipo Específico
                        </label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {formData.type.startsWith('ATA') ? (
                                <>
                                    <option value="ATA_REGULAR">Ata de Atividades Regulares</option>
                                    <option value="ATA_DIRETORIA">Ata de Reunião de Diretoria</option>
                                    <option value="ATA_COMISSAO">Ata de Comissão Executiva</option>
                                    <option value="ATA_EXTRAORDINARIA">Ata de Reunião Extraordinária</option>
                                </>
                            ) : (
                                <>
                                    <option value="ATO_NOMEACAO">Ato de Nomeação / Cargo</option>
                                    <option value="ATO_DISCIPLINAR">Ato Disciplinar</option>
                                    <option value="ATO_OUTROS">Outro Ato Administrativo</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* Attendees Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            Participantes / Assinaturas Necessárias
                        </label>
                        <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 bg-slate-50">
                            {isLoadingMembers ? (
                                <div className="text-center text-sm text-slate-400 py-2">Carregando membros...</div>
                            ) : members.length === 0 ? (
                                <div className="text-center text-sm text-slate-400 py-4">
                                    Nenhum membro encontrado neste clube.
                                </div>
                            ) : (
                                members.map((member: any) => (
                                    <label key={member.id} className="flex items-center gap-3 p-2 hover:bg-white bg-white/50 border border-transparent hover:border-slate-200 shadow-sm rounded-lg cursor-pointer transition-all">
                                        <input
                                            type="checkbox"
                                            checked={formData.attendeeIds?.includes(member.id)}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setFormData(prev => {
                                                    const current = prev.attendeeIds || [];
                                                    const updated = checked
                                                        ? [...current, member.id]
                                                        : current.filter(id => id !== member.id);
                                                    return { ...prev, attendeeIds: updated };
                                                });
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                        />
                                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                            {member.photoUrl ? (
                                                <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px] font-bold">
                                                    {member.name?.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-700">{member.name}</div>
                                            <div className="text-xs text-slate-500">{member.role}</div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            * Os membros selecionados receberão uma notificação para assinar digitalmente este documento.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Conteúdo / Descrição</label>
                        <textarea
                            required
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Descreva aqui as pautas, decisões e observações..."
                            className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm leading-relaxed"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Salvando...' : 'Salvar Registro'}
                    </button>
                </div>
            </div>
        </div>
    );
}
