import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, MapPin, DollarSign, Users, FileSpreadsheet, Trash2, ClipboardList, Check } from 'lucide-react';
import { toast } from 'sonner';
// ...

import { Modal } from '../components/Modal';
import { EventCalendar } from '../components/EventCalendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
    id: string;
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate: string;
    cost: number;
    registrations?: {
        userId: string;
        attended: boolean;
        user: { name: string; photoUrl?: string };
    }[];
}

interface Member {
    id: string;
    name: string;
}

export function Events() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    // Check-in State
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [attendanceList, setAttendanceList] = useState<string[]>([]); // List of ATTENDED userIds

    // Import State
    const [isImportEventsOpen, setIsImportEventsOpen] = useState(false);
    const [isImportRegistrationsOpen, setIsImportRegistrationsOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [location, setLocation] = useState('');
    const [cost, setCost] = useState('');
    const [description, setDescription] = useState('');
    const [isScoring, setIsScoring] = useState(false);
    const [points, setPoints] = useState(50);

    // Registration State
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

    const { data: events = [] } = useQuery<Event[]>({
        queryKey: ['events', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const response = await api.get(`/events/club/${user.clubId}`);
            return response.data;
        },
        enabled: !!user?.clubId
    });

    const { data: members = [] } = useQuery<Member[]>({
        queryKey: ['members', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const response = await api.get('/users');
            return response.data;
        },
        enabled: isRegisterModalOpen
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/events', {
                ...data,
                clubId: user?.clubId,
                cost: Number(data.cost),
                startDate: new Date(data.startDate + 'T12:00:00').toISOString(),
                endDate: new Date((data.endDate || data.startDate) + 'T12:00:00').toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            setIsCreateModalOpen(false);
            resetForm();
            toast.success('Evento criado com sucesso!');
        },
        onError: (error: any) => handleError(error)
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!editingEvent) return;
            return api.patch(`/events/${editingEvent.id}`, {
                ...data,
                cost: Number(data.cost),
                startDate: new Date(data.startDate + 'T12:00:00').toISOString(),
                endDate: new Date((data.endDate || data.startDate) + 'T12:00:00').toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            setIsCreateModalOpen(false);
            setEditingEvent(null);
            resetForm();
            toast.success('Evento atualizado com sucesso!');
        },
        onError: (error: any) => handleError(error)
    });

    const updateAttendanceMutation = useMutation({
        mutationFn: async () => {
            if (!selectedEvent) return;
            // First, determine all users registered
            const allRegisteredIds = selectedEvent.registrations?.map(r => r.userId) || [];

            // To be precise: we want to update the status of those who are PRESENT (attended=true)
            // AND those who are ABSENT (attended=false).
            // But my service iterates over the provided list and sets 'attended' to the boolean passed.
            // Wait, my service: updateAttendance(id, userIds, attended).
            // If I call with (id, [u1, u2], true), it sets u1, u2 to true.
            // It does NOT set u3 to false.
            // So I need TWO calls? Or a smarter service?
            // "Chamada (Batch)": Typically sets present ones. Absent ones remain false?
            // If I uncheck someone, I want them to become false.

            // Current Service Implementation:
            // "iterate userIds... update data: { attended }"

            // Strategy:
            // 1. Call for PRESENT users (true).
            // 2. Call for ABSENT users (false).

            const presentIds = attendanceList;
            const absentIds = allRegisteredIds.filter(id => !presentIds.includes(id));

            // Parallel execution
            await Promise.all([
                presentIds.length > 0 ? api.post(`/events/${selectedEvent.id}/attendance`, { userIds: presentIds, attended: true }) : Promise.resolve(),
                absentIds.length > 0 ? api.post(`/events/${selectedEvent.id}/attendance`, { userIds: absentIds, attended: false }) : Promise.resolve()
            ]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            setIsAttendanceModalOpen(false);
            toast.success('Chamada salva com sucesso!');
        },
        onError: (error: any) => {
            console.error(error);
            toast.error('Erro ao salvar chamada.');
        }
    });

    const registerMutation = useMutation({
        mutationFn: async () => {
            if (!selectedEvent) return;
            return api.post(`/events/${selectedEvent.id}/register`, { userIds: selectedMemberIds });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            setIsRegisterModalOpen(false);
            setSelectedEvent(null);
            setSelectedMemberIds([]);
            toast.success('Inscrições realizadas com sucesso!');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/events/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            toast.success('Evento excluído com sucesso!');
        },
        onError: (error: any) => {
            console.error('Delete Error:', error);
            toast.error('Erro ao excluir evento.');
        }
    });

    const importEventsMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!user?.clubId) return;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('clubId', user.clubId);

            return api.post('/events/import-events', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            setIsImportEventsOpen(false);
            alert('Eventos importados com sucesso!');
        },
        onError: (error: any) => handleError(error)
    });

    const importRegistrationsMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            await api.post(`/events/${selectedEvent?.id}/import-registrations`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            setIsImportRegistrationsOpen(false);
            const results = (data as any).data;
            alert(`Inscrições importadas!\nSucedidos: ${results.success}\nPulados: ${results.skipped}`);
            setSelectedEvent(null);
        },
        onError: () => alert('Erro ao importar inscrições.')
    });

    // Helper Functions
    const resetForm = () => {
        setTitle('');
        setStartDate('');
        setEndDate('');
        setCost('');
        setLocation('');
        setDescription('');
        setIsScoring(false);
        setPoints(50);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingEvent(null);
        resetForm();
    };

    const handleError = (error: any) => {
        const msg = error.response?.data?.message || error.message || 'Erro desconhecido.';
        alert(`Erro: ${msg}`);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este evento?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingEvent) {
            updateMutation.mutate({ title, startDate, endDate, location, cost, description, isScoring, points: Number(points) });
        } else {
            createMutation.mutate({ title, startDate, endDate, location, cost, description, isScoring, points: Number(points) });
        }
    };

    const handleEdit = (event: Event) => {
        setEditingEvent(event);
        setTitle(event.title);
        setStartDate(new Date(event.startDate).toISOString().split('T')[0]);
        setEndDate(new Date(event.endDate).toISOString().split('T')[0]);
        setCost(event.cost.toString());
        setLocation(event.location || '');
        setDescription(event.description || '');
        // We assume isScoring isn't easily retrieved from event object unless we look at activityId?
        // But the data model doesn't return activityId explicitly in my interface.
        // It's a minor UX detail, can default to false for now.
        setIsCreateModalOpen(true);
    };

    const handleOpenRegister = (event: Event) => {
        setSelectedEvent(event);
        setIsRegisterModalOpen(true);
    };

    const handleOpenAttendance = (event: Event) => {
        setSelectedEvent(event);
        // Initialize attendance list from existing data
        const attendedIds = event.registrations
            ?.filter(r => r.attended)
            .map(r => r.userId) || [];
        setAttendanceList(attendedIds);
        setIsAttendanceModalOpen(true);
    };

    const toggleMemberSelection = (memberId: string) => {
        setSelectedMemberIds(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    const toggleAttendance = (userId: string) => {
        setAttendanceList(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId) // Uncheck
                : [...prev, userId] // Check
        );
    };

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());

    const [isDayEventsModalOpen, setIsDayEventsModalOpen] = useState(false);
    const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date, events: Event[] }>({ date: new Date(), events: [] });

    const handleDayClick = (date: Date, dayEvents: Event[]) => {
        if (dayEvents.length > 0) {
            setSelectedDayEvents({ date, events: dayEvents });
            setIsDayEventsModalOpen(true);
        } else {
            if (!['OWNER', 'ADMIN'].includes(user?.role || '')) return;
            const dateStr = date.toISOString().split('T')[0];
            setStartDate(dateStr);
            setEndDate(dateStr);
            setEditingEvent(null);
            resetForm();
            setIsCreateModalOpen(true);
        }
    };

    const filteredEvents = events.filter(event => {
        const start = new Date(event.startDate);
        return start.getMonth() === currentDate.getMonth() && start.getFullYear() === currentDate.getFullYear();
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Eventos & Acampamentos</h1>
                {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsImportEventsOpen(true)}
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
                            Criar Evento
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                    <EventCalendar
                        events={events}
                        onDayClick={handleDayClick}
                        currentDate={currentDate}
                        onNavigate={setCurrentDate}
                    />
                </div>

                <div className="flex-1 w-full space-y-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h3>

                    {filteredEvents.map(event => (
                        <div key={event.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 flex items-center gap-4 hover:border-blue-400 transition-all hover:shadow-md group">
                            <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-blue-50 rounded-lg text-blue-700 border border-blue-100">
                                <span className="text-[10px] font-bold uppercase">{format(new Date(event.startDate), 'MMM', { locale: ptBR })}</span>
                                <span className="text-lg font-bold leading-none">{format(new Date(event.startDate), 'dd')}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 text-sm truncate">{event.title}</h3>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location || 'Local indefinido'}</span>
                                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> R$ {event.cost.toFixed(2)}</span>
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {event.registrations?.length || 0}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                                    <>
                                        <button
                                            onClick={() => handleOpenAttendance(event)}
                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                            title="Lista de Presença (Chamada)"
                                        >
                                            <ClipboardList className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(event)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(event.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleOpenRegister(event)}
                                            className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 text-xs font-medium rounded transition-colors"
                                        >
                                            Gerenciar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredEvents.length === 0 && (
                        <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-sm">
                            Nenhum evento para este mês.
                        </div>
                    )}
                </div>
            </div>

            {/* Modals... */}
            {/* Create/Edit Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={handleCloseModal} title={editingEvent ? 'Editar Evento' : 'Novo Evento'}>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    {/* ... Same Form Content ... */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                        <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                            <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
                            <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Custo (R$)</label>
                        <input type="number" required min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Local</label>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <input type="checkbox" id="eventIsScoring" checked={isScoring} onChange={e => setIsScoring(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                        <label htmlFor="eventIsScoring" className="text-sm font-medium text-slate-700">Evento vale Pontos (Atividade)</label>
                    </div>
                    {isScoring && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pontos por Participação</label>
                            <input type="number" required={isScoring} min="0" value={points} onChange={e => setPoints(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg resize-none h-20" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-slate-600">Cancelar</button>
                        <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editingEvent ? 'Salvar Alterações' : 'Criar')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Attendance Modal */}
            <Modal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} title="Lista de Presença (Chamada)">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Marque quem esteve presente no evento <strong>{selectedEvent?.title}</strong>.</p>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                        {selectedEvent?.registrations?.length === 0 && <div className="p-4 text-center text-slate-400">Nenhum inscrito.</div>}

                        {selectedEvent?.registrations?.map(reg => (
                            <label key={reg.userId} className={`flex items-center gap-3 p-3 hover:bg-white cursor-pointer transition-colors ${attendanceList.includes(reg.userId) ? 'bg-emerald-50' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={attendanceList.includes(reg.userId)}
                                    onChange={() => toggleAttendance(reg.userId)}
                                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                                />
                                <span className={`flex-1 font-medium ${attendanceList.includes(reg.userId) ? 'text-emerald-800' : 'text-slate-700'}`}>
                                    {reg.user?.name || 'Membro desconhecido'}
                                </span>
                                {attendanceList.includes(reg.userId) && <Check className="w-4 h-4 text-emerald-600" />}
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        <span className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {attendanceList.length} presentes
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => setIsAttendanceModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                            <button
                                onClick={() => updateAttendanceMutation.mutate()}
                                disabled={updateAttendanceMutation.isPending}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium"
                            >
                                {updateAttendanceMutation.isPending ? 'Salvando...' : 'Salvar Chamada'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Register Modal */}
            <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title={`Inscrições: ${selectedEvent?.title}`}>
                {/* Re-using existing content logic for brevity, assuming standard implementation */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500">Selecione os membros.</p>
                        <button onClick={() => setIsImportRegistrationsOpen(true)} className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-medium">
                            <FileSpreadsheet className="w-3.5 h-3.5" /> Importar Excel
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                        {members.map(member => (
                            <label key={member.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" checked={selectedMemberIds.includes(member.id)} onChange={() => toggleMemberSelection(member.id)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                                <span className="text-slate-700">{member.name}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        <span className="text-sm font-bold text-blue-600">{selectedMemberIds.length} selecionados</span>
                        <div className="flex gap-2">
                            <button onClick={() => setIsRegisterModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                            <button onClick={() => registerMutation.mutate()} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Confirmar Inscrições</button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Import Modals reused... */}
            <Modal isOpen={isImportEventsOpen} onClose={() => setIsImportEventsOpen(false)} title="Importar Eventos"><div className="space-y-4"><input type="file" onChange={(e) => e.target.files?.[0] && importEventsMutation.mutate(e.target.files[0])} /></div></Modal>
            <Modal isOpen={isImportRegistrationsOpen} onClose={() => setIsImportRegistrationsOpen(false)} title="Importar Inscrições"><div className="space-y-4"><input type="file" onChange={(e) => e.target.files?.[0] && importRegistrationsMutation.mutate(e.target.files[0])} /></div></Modal>

            {/* Day Events Modal reused... */}
            <Modal isOpen={isDayEventsModalOpen} onClose={() => setIsDayEventsModalOpen(false)} title={`Eventos em ${selectedDayEvents.date.toLocaleDateString()}`}>
                {/* ... reused content ... */}
                <div className="space-y-3">
                    {selectedDayEvents.events.map(event => (
                        <div key={event.id} className="p-3 border border-slate-200 rounded-lg flex justify-between items-center hover:border-blue-300 bg-white">
                            <div><h4 className="font-bold text-slate-800">{event.title}</h4></div>
                            <button onClick={() => handleEdit(event)} className="p-1.5 text-slate-400 hover:text-blue-600">Edit</button>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
