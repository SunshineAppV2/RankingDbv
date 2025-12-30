
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { CheckSquare, Plus, Edit, Trash2, Award, FileSpreadsheet, BookOpen, Medal, UserPlus, Link, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Modal } from '../components/Modal';
import { SpecialtyDetailsModal } from '../components/SpecialtyDetailsModal';
import { AdminSpecialtyReviewModal } from '../components/AdminSpecialtyReviewModal';
import { ROLE_TRANSLATIONS } from './members/types';

import { useNavigate } from 'react-router-dom';

import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Activity {
    id: string;
    title: string;
    description: string;
    points: number;
    clubId: string;
    type?: string;
}

interface Specialty {
    id: string;
    name: string;
    area: string;
    imageUrl?: string;
    requirements: { id: string; description: string; type: 'TEXT' | 'FILE' }[];
}

interface UserSpecialty {
    id: string;
    specialtyId: string;
    status: 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'COMPLETED';
    awardedAt?: string;
}

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    photoUrl?: string;
    unitId?: string;
}

type ItemType = 'ACTIVITY' | 'SPECIALTY' | 'CLASS' | 'APPROVAL'; // Added APPROVAL

interface DisplayItem {
    id: string;
    title: string;
    description: string;
    points: number;
    type: ItemType;
    original: any;
    imageUrl?: string;
    area?: string;
    status?: string; // For Approval items
    userName?: string; // For Approval items
    isAssigned?: boolean;
    activityType?: 'INDIVIDUAL' | 'UNIT';
}

const CLASSES = ['AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];

export function Activities() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
    const [filter, setFilter] = useState<ItemType | 'ALL'>('ALL');
    const [search, setSearch] = useState('');

    // Details Modal State
    const [selectedDetailSpecialty, setSelectedDetailSpecialty] = useState<Specialty | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Admin Review Modal State
    const [selectedReview, setSelectedReview] = useState<any>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    // Form and Editing State
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [points, setPoints] = useState(10);
    const [type, setType] = useState<string>('INDIVIDUAL');

    // Award State
    const [selectedActivityForAward, setSelectedActivityForAward] = useState<Activity | null>(null);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [allSelected, setAllSelected] = useState(false);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

    // Assign State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedSpecialtyForAssign, setSelectedSpecialtyForAssign] = useState<Specialty | null>(null);
    const [assignMemberIds, setAssignMemberIds] = useState<string[]>([]);
    const [allMembersSelected, setAllMembersSelected] = useState(false);

    const isAdmin = ['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(user?.role || '');

    // Queries

    // Queries
    const { data: activities = [], isLoading: isLoadingActivities } = useQuery<Activity[]>({
        queryKey: ['activities', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const q = query(collection(db, 'activities'), where('clubId', '==', user.clubId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Activity));
        },
        enabled: !!user?.clubId
    });

    const { data: specialties = [] } = useQuery<Specialty[]>({
        queryKey: ['specialties-feed'], // consistent cache key
        queryFn: async () => {
            const snapshot = await getDocs(collection(db, 'specialties'));
            return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Specialty));
        },
        staleTime: 1000 * 60 * 60 // 1 hour
    });

    const { data: members = [] } = useQuery<Member[]>({
        queryKey: ['members'],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const q = query(collection(db, 'users'), where('clubId', '==', user.clubId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Member));
        },
        enabled: (isAwardModalOpen || isAssignModalOpen) && !!user?.clubId
    });

    const { data: mySpecialties = [] } = useQuery<UserSpecialty[]>({
        queryKey: ['my-specialties-profile', user?.uid], // Reuse key for cache
        queryFn: async () => {
            if (!user?.uid) return [];
            const q = query(collection(db, 'user_specialties'), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as UserSpecialty));
        },
        enabled: !!user?.uid
    });

    const { data: units = [] } = useQuery<any[]>({
        queryKey: ['units', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const q = query(collection(db, 'units'), where('clubId', '==', user.clubId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        },
        enabled: !!user?.clubId && isAwardModalOpen && selectedActivityForAward?.type === 'UNIT'
    });

    const { data: pendingApprovals = { requirements: [], specialties: [] } } = useQuery({
        queryKey: ['pending-approvals', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return { requirements: [], specialties: [] };
            // Mocking pending approvals for now as it requires complex joins or denormalization
            // Logic: Query 'user_specialties' where status == 'WAITING_APPROVAL' and clubId == user.clubId
            const q = query(collection(db, 'user_specialties'), where('clubId', '==', user.clubId), where('status', '==', 'WAITING_APPROVAL'));
            const snapshot = await getDocs(q);
            // Manually join with User and Specialty
            const specs = await Promise.all(snapshot.docs.map(async (d: any) => {
                const data = d.data();
                const userSnap = await getDoc(doc(db, 'users', data.userId));
                const specSnap = await getDoc(doc(db, 'specialties', data.specialtyId));
                return {
                    ...data,
                    id: d.id,
                    user: userSnap.exists() ? userSnap.data() : { name: 'Unknown' },
                    requirement: { specialty: specSnap.exists() ? specSnap.data() : { name: 'Unknown' }, specialtyId: data.specialtyId }
                };
            }));
            return { requirements: specs, specialties: [] }; // Using 'requirements' array structure to match existing logic
        },
        enabled: isAdmin && !!user?.clubId
    });

    // Merged Data
    const displayItems = useMemo(() => {
        const items: DisplayItem[] = [];

        // 0. Pending Approvals (Only if filter is APPROVAL)
        // 0. Pending Approvals (Only if filter is APPROVAL)
        if (filter === 'APPROVAL' && isAdmin) {
            const map = new Map<string, any>();

            pendingApprovals.requirements.forEach((r: any) => {
                const isSpecialty = !!r.requirement.specialty;
                const isClass = !!r.requirement.dbvClass;

                let key = '';
                let title = '';
                let contextId = '';
                let contextType: 'SPECIALTY' | 'CLASS' = 'SPECIALTY';
                let imageUrl = undefined;
                let description = '';

                if (isSpecialty) {
                    key = `${r.userId}-${r.requirement.specialtyId}`;
                    title = r.requirement.specialty.name;
                    contextId = r.requirement.specialtyId;
                    contextType = 'SPECIALTY';
                    imageUrl = r.requirement.specialty.imageUrl;
                    description = `Especialidade pendente de ${r.user.name}`;
                } else if (isClass) {
                    key = `${r.userId}-${r.requirement.dbvClass}`;
                    title = `Classe de ${r.requirement.dbvClass}`;
                    contextId = r.requirement.dbvClass;
                    contextType = 'CLASS';
                    description = `Requisito de Classe pendente de ${r.user.name}`;
                } else {
                    // Fallback or ignore
                    return;
                }

                if (!map.has(key)) {
                    map.set(key, {
                        type: 'APPROVAL',
                        id: key,
                        title: title,
                        description: description,
                        points: 0,
                        // Pass new generic context structure
                        original: {
                            context: { type: contextType, id: contextId, title },
                            member: r.user,
                            initialUserRequirements: [r] // Pass this item itself as known pending
                        },
                        userName: r.user.name,
                        imageUrl: imageUrl,
                        status: 'Requisito Pendente'
                    });
                } else {
                    // If exists, maybe push to initialUserRequirements?
                    const existing = map.get(key);
                    existing.original.initialUserRequirements.push(r);
                }
            });

            Array.from(map.values()).forEach(v => items.push(v));
            return items;
        }

        // 1. Activities
        activities.forEach(a => items.push({
            id: a.id,
            title: a.title,
            description: a.description,
            points: a.points,
            type: 'ACTIVITY',
            original: a,
            activityType: a.type as any
        }));

        // 2. Specialties
        specialties.forEach(s => {
            // Check if user has this specialty
            const userSpecialty = mySpecialties.find(ms => ms.specialtyId === s.id);
            const isAssigned = !!userSpecialty;

            items.push({
                id: s.id,
                title: s.name,
                description: s.area,
                points: 250, // Standard points
                type: 'SPECIALTY',
                imageUrl: s.imageUrl,
                original: s,
                isAssigned // Helper prop for sorting/display
            });
        });

        // 3. Classes
        CLASSES.forEach((c) => items.push({
            id: `class-${c}`,
            title: `Classe de ${c.charAt(0) + c.slice(1).toLowerCase()}`,
            description: 'Requisitos de Classe Regular',
            points: 0,
            type: 'CLASS',
            original: c
        }));

        let filteredItems = items.filter(item => filter === 'ALL' || item.type === filter);

        // SEARCH FILTER
        if (search) {
            const lowerSearch = search.toLowerCase();
            filteredItems = filteredItems.filter(item =>
                item.title.toLowerCase().includes(lowerSearch) ||
                item.description?.toLowerCase().includes(lowerSearch)
            );
        }

        // SORTING: Priority to Assigned Specialties
        filteredItems.sort((a, b) => {
            if (a.type === 'SPECIALTY' && b.type === 'SPECIALTY') {
                // If a is assigned and b is not, a comes first
                if ((a as any).isAssigned && !(b as any).isAssigned) return -1;
                if (!(a as any).isAssigned && (b as any).isAssigned) return 1;
            }
            // Fallback alpha sort or default
            return 0;
        });

        return filteredItems;
    }, [activities, specialties, filter, mySpecialties, search]);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isUrlImportOpen, setIsUrlImportOpen] = useState(false);
    const [importUrl, setImportUrl] = useState('');

    // --- Mutations ---

    const importActivitiesMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('clubId', user!.clubId!);

            await api.post('/activities/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            setIsImportModalOpen(false);
            alert('Atividades importadas com sucesso!');
        },
        onError: () => {
            alert('Erro ao importar atividades. Verifique a planilha.');
        }
    });

    const importUrlMutation = useMutation({
        mutationFn: async (url: string) => {
            await api.post('/specialties/import-url', { url });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['specialties-feed'] });
            setIsUrlImportOpen(false);
            setImportUrl('');
            alert('Especialidade importada com sucesso!');
        },
        onError: (error: any) => {
            alert('Erro ao importar: ' + (error.response?.data?.message || 'Erro desconhecido'));
        }
    });


    const createActivityMutation = useMutation({
        mutationFn: async (newActivity: any) => {
            // Generate ID automatically via addDoc, returns DocumentReference
            return await addDoc(collection(db, 'activities'), {
                ...newActivity,
                clubId: user?.clubId,
                createdAt: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            closeModal();
            toast.success('Atividade criada!');
        },
        onError: (err: any) => {
            console.error(err);
            alert('Erro ao criar atividade: ' + err.message);
        }
    });

    const updateActivityMutation = useMutation({
        mutationFn: async (data: { id: string, updates: any }) => {
            const docRef = doc(db, 'activities', data.id);
            await updateDoc(docRef, data.updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            closeModal();
            toast.success('Atividade atualizada!');
        },
        onError: (err: any) => {
            console.error(err);
            alert('Erro ao atualizar: ' + err.message);
        }
    });

    const deleteActivityMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteDoc(doc(db, 'activities', id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            toast.success('Atividade excluída!');
        },
        onError: (err: any) => {
            console.error(err);
            alert('Erro ao excluir: ' + err.message);
        }
    });

    const awardPointsMutation = useMutation({
        mutationFn: async (data: { userId?: string, unitId?: string, activityId: string }) => {
            // Batch write: Add Points Log AND Increment User Log
            const batch = writeBatch(db);
            const userRef = doc(db, 'users', data.userId!);
            const logRef = doc(collection(db, 'points_logs')); // auto-generate ID for logs

            // 1. Log the transaction
            const points = selectedActivityForAward?.points || 0;
            batch.set(logRef, {
                userId: data.userId,
                activityId: data.activityId,
                points: points,
                reason: selectedActivityForAward?.title || 'Atividade',
                type: 'ACTIVITY',
                createdAt: new Date().toISOString(),
                clubId: user?.clubId
            });

            // 2. Increment User Points (Using Firestore increment to be safe)
            batch.update(userRef, {
                points: increment(points)
            });

            await batch.commit();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
        },
        onError: (err) => {
            console.error("Erro ao pontuar usuário", err);
            toast.error("Erro ao lançar pontos");
        }
    });

    const assignSpecialtyMutation = useMutation({
        mutationFn: async (data: { userId: string, specialtyId: string }) => {
            // Check if already assigned? Ideally query first but for simplicity just adding
            return await addDoc(collection(db, 'user_specialties'), {
                userId: data.userId,
                specialtyId: data.specialtyId,
                status: 'IN_PROGRESS',
                clubId: user?.clubId,
                assignedAt: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['member-specialties'] });
            queryClient.invalidateQueries({ queryKey: ['my-specialties-profile'] });
            queryClient.invalidateQueries({ queryKey: ['specialties-feed'] });
            toast.success('Especialidade atribuída!');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Erro ao atribuir especialidade.');
        }
    });

    // --- Handlers ---

    const openCreateModal = () => {
        setEditingActivity(null);
        setTitle('');
        setDescription('');
        setPoints(10);
        setType('INDIVIDUAL');
        setIsModalOpen(true);
    };

    const openEditModal = (activity: Activity) => {
        setEditingActivity(activity);
        setTitle(activity.title);
        setDescription(activity.description);
        setPoints(activity.points);
        setType(activity.type || 'INDIVIDUAL');
        setIsModalOpen(true);
    };

    const openAwardModal = (activity: Activity) => {
        setSelectedActivityForAward(activity);
        setSelectedMemberIds([]);
        setAllSelected(false);
        setSelectedUnitId(null);
        setIsAwardModalOpen(true);
    };

    const openAssignModal = (specialty: Specialty) => {
        setSelectedSpecialtyForAssign(specialty);
        setAssignMemberIds([]);
        setAllMembersSelected(false);
        setIsAssignModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingActivity(null);
        setTitle('');
        setDescription('');
        setPoints(10);
        setType('INDIVIDUAL');
    };

    const closeAwardModal = () => {
        setIsAwardModalOpen(false);
        setSelectedActivityForAward(null);
        setSelectedMemberIds([]);
        setAllSelected(false);
        setSelectedUnitId(null);
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.clubId) {
            alert('Erro: Usuário sem clube vinculado.');
            return;
        }

        const activityData = { title, description, points: Number(points), type };

        if (editingActivity) {
            updateActivityMutation.mutate({
                id: editingActivity.id,
                updates: activityData
            });
        } else {
            createActivityMutation.mutate(activityData);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Deseja realmente excluir esta atividade?')) {
            deleteActivityMutation.mutate(id);
        }
    };

    const toggleMemberSelection = (memberId: string) => {
        setSelectedMemberIds(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    const visibleMembers = useMemo(() => {
        if (selectedActivityForAward?.type === 'UNIT' && selectedUnitId) {
            return members.filter(m => m.unitId === selectedUnitId);
        }
        return members;
    }, [members, selectedActivityForAward, selectedUnitId]);

    useEffect(() => {
        if (selectedActivityForAward?.type === 'UNIT' && selectedUnitId) {
            const unitMembers = members.filter(m => m.unitId === selectedUnitId).map(m => m.id);
            setSelectedMemberIds(unitMembers);
            setAllSelected(true);
        }
    }, [selectedUnitId, selectedActivityForAward, members]);

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedMemberIds([]);
        } else {
            setSelectedMemberIds(visibleMembers.map(m => m.id));
        }
        setAllSelected(!allSelected);
    };

    const handleAwardSubmit = async () => {
        if (!selectedActivityForAward) return;

        if (selectedMemberIds.length === 0) return;

        const confirmMsg = `Confirma lançar ${selectedActivityForAward.points} pontos para ${selectedMemberIds.length} membro(s)?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await Promise.all(
                selectedMemberIds.map(userId =>
                    awardPointsMutation.mutateAsync({
                        userId,
                        activityId: selectedActivityForAward.id
                    })
                )
            );
            alert('Pontos lançados com sucesso!');
            closeAwardModal();
        } catch (error) {
            alert('Erro ao lançar pontos. Verifique o console.');
        }
    };

    const handleAssignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSpecialtyForAssign || assignMemberIds.length === 0) return;

        try {
            await Promise.all(
                assignMemberIds.map(userId =>
                    assignSpecialtyMutation.mutateAsync({
                        userId,
                        specialtyId: selectedSpecialtyForAssign.id
                    })
                )
            );
            alert(`Especialidade atribuída com sucesso para ${assignMemberIds.length} membro(s)!`);
            setIsAssignModalOpen(false);
            setAssignMemberIds([]);
            setSelectedSpecialtyForAssign(null);
            setAllMembersSelected(false);
        } catch (err) {
            console.error(err);
            alert('Erro ao atribuir especialidade(s).');
        }
    };

    if (isLoadingActivities) return <div className="p-10 text-center">Carregando Atividades...</div>;

    const isSaving = createActivityMutation.isPending || updateActivityMutation.isPending;
    const isAwarding = awardPointsMutation.isPending;
    const isAssigning = assignSpecialtyMutation.isPending;
    // isAdmin is defined at top of component

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Atividades do Clube</h1>
                {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsUrlImportOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Link className="w-5 h-5" />
                            Importar Link
                        </button>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            Importar Excel
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Nova Atividade
                        </button>
                    </div>
                )}
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Pesquisar atividades, especialidades..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow shadow-sm"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filter === 'ALL'
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('ACTIVITY')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filter === 'ACTIVITY'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Atividades
                    </button>
                    <button
                        onClick={() => setFilter('SPECIALTY')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filter === 'SPECIALTY'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Especialidades
                    </button>
                    <button
                        onClick={() => setFilter('CLASS')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filter === 'CLASS'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Classes
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setFilter('APPROVAL')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filter === 'APPROVAL'
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            Aprovação
                            {/* You could add a badge count here if you want */}
                        </button>
                    )}
                </div>

            </div>

            <div className="grid gap-4">
                {displayItems.map((item) => (
                    <div key={item.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                            {/* Icon Based on Type */}
                            <div className={`p-3 rounded-lg shrink-0 ${item.type === 'ACTIVITY' ? 'bg-green-100 text-green-600' :
                                item.type === 'SPECIALTY' ? 'bg-blue-100 text-blue-600' :
                                    'bg-purple-100 text-purple-600'
                                }`}>
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt="" className="w-6 h-6 object-contain" />
                                ) : (
                                    item.type === 'ACTIVITY' ? <CheckSquare className="w-6 h-6" /> :
                                        item.type === 'SPECIALTY' ? <Medal className="w-6 h-6" /> :
                                            <BookOpen className="w-6 h-6" />
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                                    {/* Type Badge */}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.type === 'ACTIVITY' ? 'bg-green-50 text-green-700' :
                                        item.type === 'SPECIALTY' ? 'bg-blue-50 text-blue-700' :
                                            item.type === 'APPROVAL' ? 'bg-orange-50 text-orange-700' :
                                                'bg-purple-50 text-purple-700'
                                        }`}>
                                        {item.type === 'ACTIVITY' ? 'Atividade' :
                                            item.type === 'SPECIALTY' ? 'Especialidade' :
                                                item.type === 'APPROVAL' ? 'Aprovação' :
                                                    'Classe'}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm mt-1">{item.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {item.points > 0 && (
                                <span className="font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-full text-sm whitespace-nowrap">
                                    {item.points} pts
                                </span>
                            )}

                            {item.activityType === 'UNIT' && (
                                <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs whitespace-nowrap">
                                    🛡️ Unidade
                                </span>
                            )}

                            <div className="flex gap-1 ml-2 border-l pl-3 border-slate-200">
                                {/* Actions vary by Type */}
                                {item.type === 'ACTIVITY' && (
                                    <>
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={() => openAwardModal(item.original)}
                                                    className="p-2 text-slate-400 hover:text-yellow-500 transition-colors bg-slate-50 rounded-lg hover:bg-yellow-50"
                                                    title="Lançar Pontos"
                                                >
                                                    <Award className="w-4 h-4" />
                                                </button>
                                                {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                                                    <>
                                                        <button
                                                            onClick={() => openEditModal(item.original)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg hover:bg-blue-50"
                                                            title="Editar"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.original.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-slate-50 rounded-lg hover:bg-red-50"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}

                                {item.type === 'SPECIALTY' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setSelectedDetailSpecialty(item.original);
                                                setIsDetailsOpen(true);
                                            }}
                                            className="px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Ver Detalhes
                                        </button>
                                        {isAdmin && (
                                            <button
                                                onClick={() => openAssignModal(item.original)}
                                                className="p-2 text-slate-400 hover:text-green-600 transition-colors bg-slate-50 rounded-lg hover:bg-green-50"
                                                title="Atribuir a Membro"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </>
                                )}

                                {item.type === 'CLASS' && (
                                    <button
                                        onClick={() => {
                                            if (isAdmin) {
                                                navigate('/dashboard/classes');
                                            } else {
                                                navigate(`/dashboard/requirements?class=${item.original}`);
                                            }
                                        }}
                                        className="px-3 py-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {isAdmin ? 'Gerenciar' : 'Ver Requisitos'}
                                    </button>
                                )}

                                {item.type === 'APPROVAL' && (
                                    <button
                                        onClick={() => {
                                            setSelectedReview(item.original);
                                            setIsReviewOpen(true);
                                        }}
                                        className="px-3 py-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Avaliar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {displayItems.length === 0 && (
                    <div className="p-10 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                        Nenhum item encontrado nesta categoria.
                    </div>
                )}
            </div>

            {/* Modal de Criar/Editar */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingActivity ? 'Editar Atividade' : 'Nova Atividade'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Ex: Leitura Bíblica"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                            rows={3}
                            placeholder="Detalhes da atividade..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Pontuação</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value as any)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="INDIVIDUAL">Individual (Desbravador)</option>
                            <option value="UNIT">Coletiva (Unidade)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pontos (XP)</label>
                        <input
                            type="number"
                            required
                            value={points}
                            onChange={e => setPoints(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Atividade'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Lançar Pontos */}
            <Modal
                isOpen={isAwardModalOpen}
                onClose={closeAwardModal}
                title={`Lançar Pontos: ${selectedActivityForAward?.title}`}
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                        <span className="text-blue-800 font-medium">Pontuação:</span>
                        <span className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                            {selectedActivityForAward?.points} XP
                        </span>
                    </div>

                    {selectedActivityForAward?.type === 'UNIT' && !selectedUnitId ? (
                        <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                            <div className="p-3 bg-slate-50 border-b border-slate-100 font-medium text-slate-700 sticky top-0">
                                Selecione a Unidade (Pontuação Coletiva)
                            </div>
                            {units.length === 0 ? (
                                <div className="p-4 text-center text-slate-500 text-sm">Nenhuma unidade encontrada.</div>
                            ) : (
                                [...units].sort((a: any, b: any) => a.name.localeCompare(b.name)).map((u: any) => (
                                    <label key={u.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                                        <input
                                            type="radio"
                                            name="unitSelection"
                                            checked={selectedUnitId === u.id}
                                            onChange={() => setSelectedUnitId(u.id)}
                                            className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{u.name}</p>
                                            <p className="text-xs text-slate-500">{u.memberCount || 0} membros</p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">
                                        {selectedActivityForAward?.type === 'UNIT' && selectedUnitId
                                            ? `Membros: ${units.find(u => u.id === selectedUnitId)?.name || 'Unidade'}`
                                            : 'Selecionar Todos'}
                                    </span>
                                </div>
                                {selectedActivityForAward?.type === 'UNIT' && selectedUnitId && (
                                    <button
                                        onClick={() => setSelectedUnitId(null)}
                                        className="text-xs text-blue-600 hover:underline font-medium"
                                    >
                                        Trocar Unidade
                                    </button>
                                )}
                            </div>
                            {visibleMembers.length === 0 ? (
                                <div className="p-4 text-center text-slate-500 text-sm">Nenhum membro encontrado.</div>
                            ) : (
                                [...visibleMembers].sort((a, b) => a.name.localeCompare(b.name)).map(member => (
                                    <label key={member.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                                        <input
                                            type="checkbox"
                                            checked={selectedMemberIds.includes(member.id)}
                                            onChange={() => toggleMemberSelection(member.id)}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{member.name}</p>
                                            <p className="text-xs text-slate-500">{ROLE_TRANSLATIONS[member.role] || member.role}</p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={closeAwardModal}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleAwardSubmit}
                            disabled={isAwarding || selectedMemberIds.length === 0}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-medium"
                        >
                            {isAwarding ? 'Lançando...' : `Lançar para ${selectedMemberIds.length} membro(s)`}
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Modal Importar URL */}
            <Modal
                isOpen={isUrlImportOpen}
                onClose={() => setIsUrlImportOpen(false)}
                title="Importar Especialidade (MDA Wiki)"
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (importUrl) importUrlMutation.mutate(importUrl);
                }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Link da Especialidade (mda.wiki.br)</label>
                        <input
                            type="url"
                            required
                            value={importUrl}
                            onChange={e => setImportUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="https://mda.wiki.br/Especialidade_de_..."
                        />
                        <p className="text-xs text-slate-500 mt-1">O sistema irá extrair automaticamente o nome, área e requisitos.</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsUrlImportOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={importUrlMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {importUrlMutation.isPending ? 'Importando...' : 'Importar'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Importação */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Atividades (Excel)"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        O arquivo deve conter as colunas: <strong>Titulo</strong>, <strong>Descricao</strong>, <strong>Pontos</strong>.
                    </p>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                if (window.confirm('Confirmar importação deste arquivo?')) {
                                    importActivitiesMutation.mutate(e.target.files[0]);
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
                    {importActivitiesMutation.isPending && (
                        <p className="text-center text-emerald-600 font-medium">Processando planilha...</p>
                    )}
                </div>
            </Modal>

            {/* Modal de Atribuição (Assign) */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title={`Atribuir Especialidade: ${selectedSpecialtyForAssign?.name}`}
            >
                <form onSubmit={handleAssignSubmit} className="space-y-4">
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
                        {selectedSpecialtyForAssign?.imageUrl ? (
                            <img src={selectedSpecialtyForAssign.imageUrl} alt="" className="w-16 h-16 object-contain" />
                        ) : (
                            <div className="w-16 h-16 bg-white rounded-full border-2 border-slate-200 flex items-center justify-center">
                                <Medal className="w-8 h-8 text-slate-300" />
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-slate-800">{selectedSpecialtyForAssign?.name}</h3>
                            <p className="text-sm text-slate-500">{selectedSpecialtyForAssign?.area}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Selecione os Membros ({assignMemberIds.length})</label>
                        <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                            <div className="p-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50 sticky top-0">
                                <input
                                    type="checkbox"
                                    checked={allMembersSelected}
                                    onChange={() => {
                                        if (allMembersSelected) {
                                            setAssignMemberIds([]);
                                        } else {
                                            setAssignMemberIds(members.map(m => m.id));
                                        }
                                        setAllMembersSelected(!allMembersSelected);
                                    }}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Selecionar Todos</span>
                            </div>
                            {members.length === 0 ? (
                                <div className="p-4 text-center text-slate-500 text-sm">Nenhum membro encontrado.</div>
                            ) : (
                                members.map(member => (
                                    <label key={member.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                                        <input
                                            type="checkbox"
                                            checked={assignMemberIds.includes(member.id)}
                                            onChange={() => {
                                                setAssignMemberIds(prev =>
                                                    prev.includes(member.id)
                                                        ? prev.filter(id => id !== member.id)
                                                        : [...prev, member.id]
                                                );
                                            }}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{member.name}</p>
                                            <p className="text-xs text-slate-500">{ROLE_TRANSLATIONS[member.role] || member.role}</p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Membros selecionados verão esta especialidade em suas listas.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsAssignModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isAssigning || assignMemberIds.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                            {isAssigning ? 'Atribuindo...' : `Atribuir a ${assignMemberIds.length} membro(s)`}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Specialty Details Modal */}
            <SpecialtyDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                specialty={selectedDetailSpecialty}
                userSpecialty={mySpecialties.find(ms => ms.specialtyId === selectedDetailSpecialty?.id)}
            />

            {/* Admin Review Modal */}
            {
                selectedReview && (
                    <AdminSpecialtyReviewModal
                        isOpen={isReviewOpen}
                        onClose={() => {
                            setIsReviewOpen(false);
                            setSelectedReview(null);
                            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] }); // Refresh list
                        }}
                        context={selectedReview.original?.context}
                        member={selectedReview.member}
                        initialUserRequirements={selectedReview.original?.initialUserRequirements}
                    />
                )
            }
        </div >
    );
}

