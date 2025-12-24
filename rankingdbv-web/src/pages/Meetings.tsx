import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, Users, CheckCircle, ChevronRight, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../components/Modal';

interface Meeting {
    id: string;
    title: string;
    date: string;
    type: string;
    points: number;
    _count?: {
        attendances: number;
    };
}

interface Member {
    id: string;
    name: string;
    role: string;
    unit?: { name: string };
}

export function Meetings() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // View State
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState('REGULAR');
    const [points, setPoints] = useState(10);
    const [isScoring, setIsScoring] = useState(false);

    // Attendance State
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // --- Queries ---

    const { data: meetings = [] } = useQuery({
        queryKey: ['meetings', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const response = await api.get(`/meetings/club/${user.clubId}`);
            return response.data;
        },
        enabled: !!user?.clubId && !selectedMeeting
    });

    const { data: members = [] } = useQuery<Member[]>({
        queryKey: ['members', user?.clubId],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data;
        },
        enabled: !!selectedMeeting // Only fetch when inside a meeting
    });

    // --- Mutations ---

    const importMeetingsMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!user?.clubId) {
                alert('Erro: Club ID não encontrado.');
                return;
            }
            const formData = new FormData();
            formData.append('file', file);
            formData.append('clubId', user.clubId);

            return api.post('/meetings/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            setIsImportModalOpen(false);
            alert('Reuniões importadas com sucesso!');
        },
        onError: (error: any) => {
            console.error('Import Error:', error);
            const message = error.response?.data?.message || 'Erro ao importar reuniões. Verifique a planilha.';
            alert(message);
        }
    });

    const [isAttendanceImportOpen, setIsAttendanceImportOpen] = useState(false);
    const importAttendanceMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.post(`/meetings/${selectedMeeting?.id}/import-attendance`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            setIsAttendanceImportOpen(false);
            const results = (data as any).data;
            alert(`Presença importada!\nSucedidos: ${results.success}\nPulados: ${results.skipped}${results.errors?.length ? `\n\nErros:\n${results.errors.join('\n')}` : ''}`);
            setSelectedMeeting(null);
        },
        onError: (error: any) => {
            console.error('Attendance Import Error:', error);
            const message = error.response?.data?.message || 'Erro ao importar presença. Verifique a planilha.';
            alert(message);
        }
    });

    const createMeetingMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/meetings', { ...data, clubId: user?.clubId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            closeCreateModal();
            alert('Reunião agendada com sucesso!');
        },
        onError: (error) => {
            console.error(error);
            alert('Erro ao agendar reunião. Verifique os dados e tente novamente.');
        }
    });

    const registerAttendanceMutation = useMutation({
        mutationFn: async (data: { meetingId: string, userIds: string[] }) => {
            return api.post(`/meetings/${data.meetingId}/attendance`, { userIds: data.userIds });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            alert('Presença registrada e pontos lançados!');
            setSelectedMeeting(null);
            setSelectedMemberIds([]);
        },
        onError: (error: any) => {
            console.error('Attendance Error:', error);
            const message = error.response?.data?.message || 'Erro ao registrar presença.';
            alert(message);
        }
    });

    // --- Handlers ---

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMeetingMutation.mutate({ title, date, type, points: Number(points), isScoring });
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        setTitle('');
        setDate('');
        setPoints(10);
        setIsScoring(false);
    };

    const handleAttendanceSubmit = () => {
        if (!selectedMeeting || selectedMemberIds.length === 0) return;

        if (window.confirm(`Confirmar presença para ${selectedMemberIds.length} membros?`)) {
            registerAttendanceMutation.mutate({
                meetingId: selectedMeeting.id,
                userIds: selectedMemberIds
            });
        }
    };

    const toggleMember = (id: string) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedMemberIds.length === members.length) {
            setSelectedMemberIds([]);
        } else {
            setSelectedMemberIds(members.map(m => m.id));
        }
    };

    // --- Render: Attendance View ---
    if (selectedMeeting) {
        return (
            <div>
                <button
                    onClick={() => setSelectedMeeting(null)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para Lista
                </button>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{selectedMeeting.title}</h1>
                            <p className="text-slate-500">
                                {new Date(selectedMeeting.date).toLocaleDateString()} • {selectedMeeting.points} Pontos
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsAttendanceImportOpen(true)}
                                className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm border border-emerald-200"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Importar Presença
                            </button>
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                {selectedMeeting.type}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={selectedMemberIds.length === members.length && members.length > 0}
                                onChange={toggleAll}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="font-medium text-slate-700">Selecionar Todos</span>
                        </div>
                        <span className="text-sm text-slate-500">
                            {selectedMemberIds.length} selecionados
                        </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
                        {members.map(member => (
                            <label key={member.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedMemberIds.includes(member.id)}
                                    onChange={() => toggleMember(member.id)}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                />
                                <div className="flex-1">
                                    <p className="font-medium text-slate-800">{member.name}</p>
                                    <p className="text-xs text-slate-500">{member.role} • {member.unit?.name || 'Sem Unidade'}</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                        <button
                            onClick={handleAttendanceSubmit}
                            disabled={selectedMemberIds.length === 0 || registerAttendanceMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {registerAttendanceMutation.isPending ? 'Salvando...' : 'Confirmar Presença'}
                        </button>
                    </div>

                    {/* Attendance Import Modal */}
                    <Modal
                        isOpen={isAttendanceImportOpen}
                        onClose={() => setIsAttendanceImportOpen(false)}
                        title={`Importar Presença: ${selectedMeeting.title}`}
                    >
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">
                                O arquivo deve conter uma coluna <strong>Email</strong> ou <strong>Nome</strong>.
                            </p>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        if (window.confirm('Confirmar importação de presença para esta reunião?')) {
                                            importAttendanceMutation.mutate(e.target.files[0]);
                                        }
                                    }
                                }}
                                className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-emerald-50 file:text-emerald-700
                                hover:file:bg-emerald-100"
                            />
                            {importAttendanceMutation.isPending && (
                                <p className="text-center text-emerald-600 font-medium">Processando planilha...</p>
                            )}
                        </div>
                    </Modal>
                </div>
            </div>

        );
    }

    // --- Render: List View ---
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Reuniões & Chamada</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                        Importar Excel
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nova Reunião
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {meetings.map((meeting: Meeting) => (
                    <div key={meeting.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{meeting.title}</h3>
                                <p className="text-slate-500 text-sm">
                                    {new Date(meeting.date).toLocaleDateString()} • {meeting.type}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Users className="w-4 h-4" />
                                <span>{meeting._count?.attendances || 0} presentes</span>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedMeeting(meeting);
                                    setSelectedMemberIds([]);
                                }}
                                className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
                            >
                                Fazer Chamada
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {meetings.length === 0 && (
                    <div className="p-10 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                        Nenhuma reunião agendada.
                    </div>
                )}
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                title="Agendar Reunião"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Reunião Regular"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="REGULAR">Regular</option>
                                <option value="SPECIAL">Especial</option>
                                <option value="CAMP">Acampamento</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isScoring"
                                checked={isScoring}
                                onChange={e => setIsScoring(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isScoring" className="text-sm font-medium text-slate-700">
                                Valer Pontos (Atividade)
                            </label>
                        </div>

                        {isScoring && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pontos (Presença)</label>
                                <input
                                    type="number"
                                    required={isScoring}
                                    min="0"
                                    value={points}
                                    onChange={e => setPoints(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={closeCreateModal}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={createMeetingMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {createMeetingMutation.isPending ? 'Criando...' : 'Agendar'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Reuniões (Excel)"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        O arquivo deve conter as colunas: <strong>Titulo</strong>, <strong>Data</strong> (DD/MM/AAAA), <strong>Tipo</strong>, <strong>Pontos</strong>.
                    </p>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                if (window.confirm('Confirmar importação deste arquivo?')) {
                                    importMeetingsMutation.mutate(e.target.files[0]);
                                }
                            }
                        }}
                        className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-emerald-50 file:text-emerald-700
                            hover:file:bg-emerald-100"
                    />
                    {importMeetingsMutation.isPending && (
                        <p className="text-center text-emerald-600 font-medium">Processando planilha...</p>
                    )}
                </div>
            </Modal>

        </div>
    );
}
