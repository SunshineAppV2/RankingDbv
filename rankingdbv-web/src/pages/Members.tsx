
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { User, Mail, Trash2, Edit, Plus, Eye, ListChecks, Check, X, FileText, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { MemberDetailsModal } from '../components/MemberDetailsModal';
import React from 'react';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    <h2 className="text-xl font-bold mb-2">Algo deu errado.</h2>
                    <p className="mb-4">Por favor, recarregue a página.</p>
                    <details className="mt-2 p-2 bg-red-100 rounded text-xs font-mono whitespace-pre-wrap">
                        <summary>Ver Detalhes do Erro</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.error && this.state.error.stack}
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

// Interfaces
interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    clubId: string | null;
    unitId?: string | null;
    club?: { name: string };
    dbvClass?: string | null;
    sex?: string;
    birthDate?: string;
    maritalStatus?: string;
    phone?: string;
    mobile?: string;
    isBaptized?: boolean;
    rg?: string;
    issuingOrg?: string;
    cpf?: string;
    shirtSize?: string;
    address?: string;
    addressNumber?: string;
    neighborhood?: string;
    cep?: string;
    city?: string;
    state?: string;
    complement?: string;
    educationLevel?: string;
    educationStatus?: string;
    knowledgeArea?: string;
    courseName?: string;
    institution?: string;
    schoolShift?: string;
    isHealthProfessional?: boolean;
    healthProfessionalType?: string;
    fatherName?: string;
    fatherEmail?: string;
    fatherPhone?: string;
    motherName?: string;
    motherEmail?: string;
    motherPhone?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    emergencyRelation?: string;
    susNumber?: string;
    healthPlan?: string;
    bloodType?: string;
    rhFactor?: string;
    diseasesHistory?: string[];
    hasHeartProblem?: boolean;
    heartProblemDesc?: string;
    hasDiabetes?: boolean;
    hasRenalProblem?: boolean;
    hasPsychProblem?: boolean;
    regularMedications?: string;
    specificAllergies?: string;
    recentTrauma?: string;
    recentFracture?: string;
    recentSurgery?: string;
    disabilities?: string[];
    healthNotes?: string;
}

interface Unit {
    id: string;
    name: string;
}



const ROLE_TRANSLATIONS: Record<string, string> = {
    OWNER: 'DIRETOR GERAL',
    ADMIN: 'ADMINISTRADOR',
    DIRECTOR: 'DIRETOR',
    SECRETARY: 'SECRETÁRIO(A)',
    COUNSELOR: 'CONSELHEIRO(A)',
    INSTRUCTOR: 'INSTRUTOR',
    PATHFINDER: 'DESBRAVADOR',
    PARENT: 'RESPONSÁVEL'
};

const INITIAL_FORM_DATA = {
    name: '',
    email: '',
    password: '',
    role: 'PATHFINDER',
    isActive: true,
    clubId: '',
    unitId: '',
    dbvClass: '',
    sex: 'M',
    birthDate: '',
    maritalStatus: 'SOLTEIRO',
    phone: '',
    mobile: '',
    isBaptized: false,
    rg: '',
    issuingOrg: '',
    cpf: '',
    shirtSize: '',
    address: '',
    addressNumber: '',
    neighborhood: '',
    cep: '',
    city: '',
    state: '',
    complement: '',
    educationLevel: '',
    educationStatus: '',
    knowledgeArea: '',
    courseName: '',
    institution: '',
    schoolShift: '',
    isHealthProfessional: false,
    healthProfessionalType: '',
    fatherName: '',
    fatherEmail: '',
    fatherPhone: '',
    motherName: '',
    motherEmail: '',
    motherPhone: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    susNumber: '',
    healthPlan: '',
    bloodType: '',
    rhFactor: '',
    diseasesHistory: [] as string[],
    hasHeartProblem: false,
    heartProblemDesc: '',
    hasDiabetes: false,
    hasRenalProblem: false,
    hasPsychProblem: false,
    regularMedications: '',
    specificAllergies: '',
    recentTrauma: '',
    recentFracture: '',
    recentSurgery: '',
    disabilities: [] as string[],
    healthNotes: ''
};

// --- New Components ---

function PendingApprovalsList() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: pendingApprovals = [], refetch, error } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            const response = await api.get('/requirements/approvals/pending');
            return response.data || [];
        },
        enabled: ['COUNSELOR', 'ADMIN', 'OWNER', 'INSTRUCTOR'].includes(user?.role || ''),
        retry: false
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => api.post(`/requirements/assignments/${id}/approve`),
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
        },
        onError: () => alert('Erro ao aprovar.')
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => api.post(`/requirements/assignments/${id}/reject`),
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
        },
        onError: () => alert('Erro ao rejeitar.')
    });

    if (error || !Array.isArray(pendingApprovals) || pendingApprovals.length === 0) return null;

    return (
        <div className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Aguardando Aprovação ({pendingApprovals.length})
            </h2>
            <div className="grid gap-4">
                {pendingApprovals.map((item: any) => {
                    if (!item?.user || !item?.requirement) return null;
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    {item.user.photoUrl ? (
                                        <img src={item.user.photoUrl} alt="User" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-slate-500" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{item.user.name}</p>
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold text-slate-900">
                                            {item.requirement.area ? `${item.requirement.area} - ` : ''}
                                            {item.requirement.code} - {item.requirement.description}
                                        </span>
                                    </div>
                                    {item.answerText && (
                                        <p className="mt-2 text-sm bg-slate-50 p-2 rounded text-slate-700 italic border border-slate-100">"{item.answerText}"</p>
                                    )}
                                    {item.answerFileUrl && (
                                        <a href={item.answerFileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                                            <FileText className="w-4 h-4" /> Ver Anexo
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => { if (window.confirm('Aprovar?')) approveMutation.mutate(item.id) }} className="bg-green-100 text-green-700 p-2 rounded hover:bg-green-200 gap-2 flex items-center text-sm font-bold">
                                    <Check className="w-4 h-4" /> Aprovar
                                </button>
                                <button onClick={() => { if (window.confirm('Rejeitar?')) rejectMutation.mutate(item.id) }} className="bg-red-100 text-red-700 p-2 rounded hover:bg-red-200 gap-2 flex items-center text-sm font-bold">
                                    <X className="w-4 h-4" /> Rejeitar
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

function PendingDeliveriesList() {
    const { user } = useAuth();
    const { data: pendingDeliveries = [], error } = useQuery({
        queryKey: ['pending-deliveries'],
        queryFn: async () => {
            const response = await api.get('/requirements/deliveries/pending');
            return response.data || [];
        },
        enabled: ['COUNSELOR', 'ADMIN', 'OWNER', 'INSTRUCTOR'].includes(user?.role || ''),
        retry: false
    });

    if (error || !Array.isArray(pendingDeliveries) || pendingDeliveries.length === 0) return null;

    const getDaysPending = (dateString: any) => {
        try {
            if (!dateString) return "?";
            const created = new Date(dateString);
            if (isNaN(created.getTime())) return "?";
            const diffTime = Math.abs(new Date().getTime() - created.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch { return "?"; }
    };

    return (
        <div className="mb-8 mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pendentes de Entrega ({pendingDeliveries.length})
            </h2>
            <div className="grid gap-4">
                {pendingDeliveries.map((item: any) => {
                    const days = getDaysPending(item.createdAt);
                    if (!item?.user || !item?.requirement) return null;
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-100 flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    {item.user.photoUrl ? <img src={item.user.photoUrl} className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5 text-slate-500" />}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{item.user.name}</p>
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold text-slate-900">
                                            {item.requirement.area ? `${item.requirement.area} - ` : ''}
                                            {item.requirement.code} - {item.requirement.description}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${days !== '?' && Number(days) > 7 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                    PENDENTE HÁ {days} DIAS
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

// --- Main Members Content ---

function MembersContent() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    // Assign Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedRequirementId, setSelectedRequirementId] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [classFilter, setClassFilter] = useState('');

    const [inspectingMember, setInspectingMember] = useState<Member | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Queries
    const { data: members = [], isLoading, error } = useQuery<Member[]>({
        queryKey: ['members', user?.clubId],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data || [];
        }
    });

    const { data: units = [] } = useQuery<Unit[]>({
        queryKey: ['units', formData.clubId || user?.clubId],
        queryFn: async () => {
            const tid = formData.clubId || user?.clubId;
            if (!tid) return [];
            return (await api.get(`/units/club/${tid}`)).data;
        },
        enabled: !!(formData.clubId || user?.clubId)
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs-list'],
        queryFn: async () => {
            try {
                const res = await api.get('/clubs');
                return res.data;
            } catch (error) {
                console.error("Failed to fetch clubs", error);
                return [];
            }
        },
        enabled: user?.email === 'master@rankingdbv.com',
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    const { data: requirements = [] } = useQuery<any[]>({
        queryKey: ['requirements', classFilter],
        queryFn: async () => {
            const params = classFilter ? { class: classFilter } : {};
            return (await api.get('/requirements', { params })).data;
        },
        enabled: isAssignModalOpen
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: any) => api.post('/auth/register', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            closeModal();
            toast.success('Membro criado com sucesso');
        },
        onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao criar membro.')
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: any) => api.patch(`/users/${id}`, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            queryClient.invalidateQueries({ queryKey: ['units'] }); // Refresh units to update counts
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            closeModal();
            toast.success('Membro atualizado com sucesso');
        },
        onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao atualizar membro.')
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            toast.success('Membro excluído com sucesso');
        },
        onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao excluir membro.')
    });

    const assignMutation = useMutation({
        mutationFn: async ({ rid, uids }: any) => api.post(`/requirements/${rid}/assign`, { userIds: uids }),
        onSuccess: () => { alert('Atribuído!'); setIsAssignModalOpen(false); setSelectedMemberIds([]); setSelectedRequirementId(''); },
        onError: (e: any) => alert(e.response?.data?.message || 'Erro ao atribuir.')
    });

    // Handlers
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = { ...formData };
        if (!payload.password) delete payload.password;
        // cleanup
        ['id', 'classProgress', 'requirements', 'createdAt', 'updatedAt', 'UserRequirements', 'club', 'unit', 'status'].forEach(k => delete payload[k]);

        if (editingMember) updateMutation.mutate({ id: editingMember.id, updates: payload });
        else createMutation.mutate(payload);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingMember(null); setFormData(INITIAL_FORM_DATA); };

    const [searchParams] = useSearchParams();
    const pendingApprovalsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (searchParams.get('action') === 'approvals' && pendingApprovalsRef.current) {
            pendingApprovalsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [searchParams]);

    const handleCopyInvite = async () => {
        if (!user?.clubId) return toast.error('Erro: ID do clube não encontrado.');

        const origin = window.location.origin;
        const link = `${origin}/register?clubId=${user.clubId}`;

        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            toast.warning('Atenção: Link Localhost só funcionará neste computador.');
        }

        try {
            await navigator.clipboard.writeText(link);
            toast.success('Link de convite copiado!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = link;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                toast.success('Link copiado (fallback)!');
            } catch (err) {
                toast.error('Não foi possível copiar o link via clipboard ou fallback.');
                prompt('Copie o link manualmente:', link);
            }
            document.body.removeChild(textArea);
        }
    };

    const CLASSES = ['AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: keyof Member | 'age' | 'unitName' | 'clubName'; direction: 'asc' | 'desc' } | null>(null);

    const getAge = (dateString?: string | null) => {
        if (!dateString) return '-';
        const today = new Date();
        const birthDate = new Date(dateString);
        if (isNaN(birthDate.getTime())) return '-'; // Check for invalid date
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return isNaN(age) ? '-' : age;
    };

    const handleSort = (key: keyof Member | 'age' | 'unitName' | 'clubName') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedMembers = React.useMemo(() => {
        if (!sortConfig) return members;
        // Safety check for members array
        if (!Array.isArray(members)) return [];

        return [...members].sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof Member];
            let bValue: any = b[sortConfig.key as keyof Member];

            if (sortConfig.key === 'age') {
                aValue = getAge(a.birthDate);
                bValue = getAge(b.birthDate);
                if (aValue === '-') aValue = -1; // Treat '-' as lowest for sorting
                if (bValue === '-') bValue = -1;
            } else if (sortConfig.key === 'unitName') {
                aValue = units?.find(u => u.id === a.unitId)?.name || '';
                bValue = units?.find(u => u.id === b.unitId)?.name || '';
            } else if (sortConfig.key === 'clubName') {
                aValue = a.club?.name || '';
                bValue = b.club?.name || '';
            }

            // Safe string comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [members, sortConfig, units]);

    const renderSortIcon = (column: string) => {
        if (sortConfig?.key !== column) return <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">↕</span>;
        return sortConfig.direction === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
    };

    // Helper to render TH
    const renderTh = (label: string, sortKey: string, align: 'left' | 'right' | 'center' = 'left') => (
        <th
            className={`px-6 py-4 text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 group select-none text-${align}`}
            onClick={() => handleSort(sortKey as any)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                {label} {renderSortIcon(sortKey)}
            </div>
        </th>
    );



    if (isLoading) return <div className="p-10 text-center">Carregando membros...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Erro ao carregar membros.</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">{user?.role === 'COUNSELOR' ? 'Minha Unidade' : 'Membros'}</h1>
                <div className="flex gap-2">
                    {['COUNSELOR', 'OWNER', 'ADMIN', 'INSTRUCTOR'].includes(user?.role || '') && (
                        <button onClick={() => { setIsAssignModalOpen(true); setSelectedMemberIds(members.map(m => m.id)); }} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                            <ListChecks className="w-5 h-5" /> Enviar Requisito
                        </button>
                    )}
                    {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                        <>
                            <button onClick={handleCopyInvite} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                                <Share2 className="w-5 h-5" /> Convite
                            </button>
                            <button onClick={() => { setEditingMember(null); setFormData({ ...INITIAL_FORM_DATA, clubId: user?.clubId || '' }); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                                <Plus className="w-5 h-5" /> Adicionar Membro
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Pending Approvals & Deliveries */}
            <div ref={pendingApprovalsRef}>
                <PendingApprovalsList />
            </div>
            <PendingDeliveriesList />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {renderTh("Nome", "name")}
                                {renderTh("Idade", "age")}
                                {renderTh("Contato", "email")}
                                {renderTh("Classe", "dbvClass")}
                                {user?.email === 'master@rankingdbv.com' && renderTh("Clube", "clubName")}
                                {renderTh("Unidade", "unitName")}
                                {renderTh("Cargo", "role")}
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedMembers.map(member => (
                                <tr key={member.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User className="w-4 h-4" /></div>
                                            <span className="font-medium text-slate-900">{member.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{getAge(member.birthDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600"><Mail className="w-4 h-4 inline mr-1" />{member.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`text-xs px-2 py-1 rounded-full ${member.dbvClass ? 'bg-blue-50 text-blue-700' : 'text-slate-400'}`}>{member.dbvClass || 'Nenhuma'}</span></td>
                                    {user?.email === 'master@rankingdbv.com' && <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">{member.club?.name || '-'}</td>}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{units?.find(u => u.id === member.unitId)?.name || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs font-medium">{ROLE_TRANSLATIONS[member.role] || member.role}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setInspectingMember(member); setIsDetailsOpen(true); }} className="text-slate-400 hover:text-blue-600" title="Ver Detalhes"><Eye className="w-4 h-4" /></button>
                                            {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                                                <>
                                                    <button onClick={() => { setEditingMember(member); setFormData({ ...INITIAL_FORM_DATA, ...member, password: '' } as any); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600" title="Editar"><Edit className="w-4 h-4" /></button>
                                                    <button onClick={() => { if (window.confirm('Tem certeza que deseja excluir este membro?')) deleteMutation.mutate(member.id); }} className="text-slate-400 hover:text-red-600" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {members.length === 0 && <div className="p-8 text-center text-slate-500">Nenhum membro encontrado.</div>}
            </div>

            <PendingApprovalsList />
            <PendingDeliveriesList />

            {/* Modals */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMember ? 'Editar Membro' : 'Novo Membro'}>
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
                    {/* Simplified Form Fields Rendering based on Tab logic */}
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

                            {user?.email === 'master@rankingdbv.com' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Clube (Apenas Master)</label>
                                    <select
                                        value={formData.clubId || ''}
                                        onChange={e => setFormData({ ...formData, clubId: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                        <option value="">Selecione o Clube</option>
                                        {/* Deduplicate clubs by name to avoid repetition in dropdown */}
                                        {Array.from(new Map(clubs.map((c: any) => [c.name, c])).values()).map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {user?.email === 'master@rankingdbv.com' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Clube (Apenas Master)</label>
                                    <select
                                        value={formData.clubId || ''}
                                        onChange={e => setFormData({ ...formData, clubId: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                        <option value="">Selecione o Clube</option>
                                        {clubs.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {!editingMember && (
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
                            {editingMember && (
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
                                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    {Object.entries(ROLE_TRANSLATIONS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                                <select value={formData.unitId} onChange={e => setFormData({ ...formData, unitId: e.target.value })} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option value="">Sem Unidade</option>
                                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
                        <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                    </div>
                </form>
            </Modal>

            {/* Assign Modal */}
            <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Enviar Requisito">
                <div className="space-y-4">
                    <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full p-2 border rounded">
                        <option value="">Todas as Classes</option>
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={selectedRequirementId} onChange={e => setSelectedRequirementId(e.target.value)} className="w-full p-2 border rounded">
                        <option value="">Selecione Requisito...</option>
                        {requirements.map(r => <option key={r.id} value={r.id}>{r.code} - {r.description}</option>)}
                    </select>
                    <div className="max-h-60 overflow-y-auto border rounded p-2">
                        {members.map(m => (
                            <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-gray-50">
                                <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => {
                                    setSelectedMemberIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])
                                }} />
                                <span>{m.name}</span>
                            </label>
                        ))}
                    </div>
                    <button onClick={e => { e.preventDefault(); assignMutation.mutate({ rid: selectedRequirementId, uids: selectedMemberIds }) }} className="w-full bg-purple-600 text-white p-2 rounded">Enviar</button>
                </div>
            </Modal>

            {inspectingMember && (
                <MemberDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} member={inspectingMember} />
            )}
        </div>
    );
}

export function Members() {
    return (
        <ErrorBoundary>
            <MembersContent />
        </ErrorBoundary>
    );
}
