
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Plus, Pencil, Trash2, Users, CheckSquare } from 'lucide-react';
import { Modal } from '../components/Modal';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface Unit {
    id: string;
    name: string;
    _count?: {
        members: number;
    };
}

interface User {
    id: string;
    name: string;
    role: string;
    unitId?: string | null;
}

function UnitModal({
    isOpen,
    onClose,
    title,
    unitName,
    setUnitName,
    activeTab,
    setActiveTab,
    selectedMemberIds,
    toggleSelection,
    counselors,
    members,
    unitMap,
    editingUnitId,
    handleSubmit,
    isSaving
}: any) {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="flex flex-col h-[500px]">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Unidade</label>
                    <input
                        type="text"
                        value={unitName}
                        onChange={e => setUnitName(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                        placeholder="Ex: Unidade Alpha"
                    />
                </div>

                <div className="flex border-b border-gray-200 mb-4 gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('info')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                    >
                        Membros
                    </button>
                </div>

                {activeTab === 'info' && (
                    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        <div>
                            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <Shield className="w-4 h-4 text-blue-600" /> Conselheiros
                            </h4>
                            {counselors.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Nenhum conselheiro disponível.</p>
                            ) : (
                                <div className="space-y-1">
                                    {counselors.map((u: any) => (
                                        <label key={u.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${selectedMemberIds.has(u.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedMemberIds.has(u.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                                {selectedMemberIds.has(u.id) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <span className="text-sm text-slate-700 font-medium">{u.name}</span>
                                            {/* Hidden checkbox for semantic reasons */}
                                            <input
                                                type="checkbox"
                                                checked={selectedMemberIds.has(u.id)}
                                                onChange={() => toggleSelection(u.id)}
                                                className="hidden"
                                            />
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <Users className="w-4 h-4 text-slate-500" /> Desbravadores
                            </h4>
                            {members.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Nenhum membro disponível.</p>
                            ) : (
                                <div className="space-y-1">
                                    {members.map((u: any) => {
                                        const currentUnitName = u.unitId ? unitMap[u.unitId] : null;
                                        // Unavailable if in a unit AND that unit is NOT the one we are currently editing
                                        const isUnavailable = u.unitId && u.unitId !== editingUnitId;

                                        return (
                                            <label
                                                key={u.id}
                                                className={`flex items-center gap-3 p-2 rounded-lg border transition-colors 
                                                    ${isUnavailable ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100' :
                                                        selectedMemberIds.has(u.id) ? 'bg-blue-50 border-blue-200 cursor-pointer' : 'bg-white border-transparent hover:bg-slate-50 cursor-pointer'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors 
                                                    ${isUnavailable ? 'bg-slate-200 border-slate-300' :
                                                        selectedMemberIds.has(u.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                                    }`}>
                                                    {selectedMemberIds.has(u.id) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-sm ${isUnavailable ? 'text-slate-400' : 'text-slate-700'}`}>{u.name}</span>
                                                    {currentUnitName && (
                                                        <span className="text-[10px] text-orange-500 font-medium">
                                                            {currentUnitName}
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMemberIds.has(u.id)}
                                                    onChange={() => !isUnavailable && toggleSelection(u.id)}
                                                    disabled={isUnavailable}
                                                    className="hidden"
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// Firestore Imports moved to top

// ... (UnitModal component remains same, but I need to make sure I don't break it)

export function Units() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [unitName, setUnitName] = useState('');

    // Selection state
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'info' | 'counselors' | 'members'>('info');

    // Fetch Users FIRST (needed for counts and assignment)
    const { data: users = [] } = useQuery<User[]>({
        queryKey: ['users', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const q = query(collection(db, 'users'), where('clubId', '==', user.clubId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        },
        enabled: !!user?.clubId
    });

    // Fetch Units
    const { data: rawUnits = [], isLoading } = useQuery({
        queryKey: ['units', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const q = query(collection(db, 'units'), where('clubId', '==', user.clubId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
        },
        enabled: !!user?.clubId
    });

    // Derive Units with Counts
    const units = useMemo(() => {
        return rawUnits.map(unit => ({
            ...unit,
            _count: {
                members: users.filter(u => u.unitId === unit.id).length
            }
        }));
    }, [rawUnits, users]);


    const counselors = useMemo(() => users.filter(u => ['COUNSELOR', 'CONSELHEIRO', 'INSTRUCTOR', 'INSTRUTOR'].includes(u.role)), [users]);
    const members = useMemo(() => users.filter(u => !['COUNSELOR', 'CONSELHEIRO', 'INSTRUCTOR', 'INSTRUTOR', 'OWNER', 'Admin', 'ADMIN'].includes(u.role)), [users]);

    const unitMap = useMemo(() => {
        const map: Record<string, string> = {};
        rawUnits.forEach((u: Unit) => map[u.id] = u.name);
        return map;
    }, [rawUnits]);

    // Create Unit
    const createUnitMutation = useMutation({
        mutationFn: async (data: { name: string, clubId: string, members?: string[] }) => {
            const batch = writeBatch(db);

            // 1. Create Unit
            const unitRef = doc(collection(db, 'units'));
            batch.set(unitRef, {
                name: data.name,
                clubId: data.clubId,
                createdAt: new Date().toISOString()
            });

            // 2. Assign Members
            if (data.members && data.members.length > 0) {
                data.members.forEach(memberId => {
                    const userRef = doc(db, 'users', memberId);
                    batch.update(userRef, { unitId: unitRef.id });
                });
            }

            await batch.commit();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            closeModal();
            toast.success('Unidade criada com sucesso!');
        },
        onError: () => toast.error('Erro ao criar unidade.')
    });

    // Update Unit
    const updateUnitMutation = useMutation({
        mutationFn: async (data: { id: string, name: string, members: string[] }) => {
            const batch = writeBatch(db);
            const unitRef = doc(db, 'units', data.id);

            // 1. Update Name
            batch.update(unitRef, { name: data.name });

            // 2. Update Members
            // Find users currently in this unit but NOT in new selection -> Remove them
            const currentMembers = users.filter(u => u.unitId === data.id).map(u => u.id);
            const newMembers = data.members;

            const toRemove = currentMembers.filter(id => !newMembers.includes(id));
            const toAdd = newMembers.filter(id => !currentMembers.includes(id));

            toRemove.forEach(id => {
                const userRef = doc(db, 'users', id);
                batch.update(userRef, { unitId: null });
            });

            toAdd.forEach(id => {
                const userRef = doc(db, 'users', id);
                batch.update(userRef, { unitId: data.id });
            });

            await batch.commit();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            closeModal();
            toast.success('Unidade atualizada com sucesso!');
        },
        onError: () => toast.error('Erro ao atualizar unidade.')
    });

    // Delete Unit
    const deleteUnitMutation = useMutation({
        mutationFn: async (id: string) => {
            const batch = writeBatch(db);
            const unitRef = doc(db, 'units', id);

            // 1. Delete Unit
            batch.delete(unitRef);

            // 2. Remove Unit from Members
            const unitMembers = users.filter(u => u.unitId === id);
            unitMembers.forEach(u => {
                const userRef = doc(db, 'users', u.id);
                batch.update(userRef, { unitId: null });
            });

            await batch.commit();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Unidade excluída.');
        },
        onError: () => toast.error('Erro ao excluir unidade.')
    });

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta unidade?')) {
            await deleteUnitMutation.mutateAsync(id);
        }
    };

    const handleEdit = (unit: Unit) => {
        setEditingUnit(unit);
        setUnitName(unit.name);
        setActiveTab('info');
        setIsModalOpen(true);
    };

    // Sync selection
    useEffect(() => {
        if (editingUnit && users.length > 0) {
            const currentMembers = users
                .filter(u => u.unitId === editingUnit.id)
                .map(u => u.id);
            setSelectedMemberIds(new Set(currentMembers));
        } else if (!editingUnit) {
            setSelectedMemberIds(new Set());
        }
    }, [editingUnit, users]);

    const toggleSelection = (id: string) => {
        const next = new Set(selectedMemberIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedMemberIds(next);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUnit(null);
        setUnitName('');
        setSelectedMemberIds(new Set());
        setActiveTab('info');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.clubId) {
            alert('Erro: Usuário não possui vínculo com um Clube. Contacte o suporte.');
            return;
        }

        if (editingUnit) {
            updateUnitMutation.mutate({
                id: editingUnit.id,
                name: unitName,
                members: Array.from(selectedMemberIds)
            });
        } else {
            createUnitMutation.mutate({
                name: unitName,
                clubId: user.clubId,
                members: Array.from(selectedMemberIds)
            });
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Carregando unidades...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Unidades</h1>
                    <p className="text-slate-500">Gerencie as unidades e seus membros</p>
                </div>
                {['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '') && (
                    <button
                        onClick={() => { setEditingUnit(null); setUnitName(''); setIsModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nova Unidade
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...units].sort((a: any, b: any) => a.name.localeCompare(b.name)).map((unit: any) => (
                    <div key={unit.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{unit.name}</h3>
                                    <p className="text-sm text-slate-500">{unit._count?.members || 0} membros</p>
                                </div>
                            </div>
                            {['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '') && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(unit)}
                                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(unit.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Preview Members */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex -space-x-2">
                                {[...Array(Math.min(3, unit._count?.members || 0))].map((_, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400 text-xs shadow-sm">
                                        <Users className="w-3 h-3" />
                                    </div>
                                ))}
                            </div>
                            {(unit._count?.members || 0) > 3 && (
                                <span className="text-xs text-slate-500">+{(unit._count?.members || 0) - 3}</span>
                            )}
                        </div>
                    </div>
                ))}

                {units.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <Shield className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">Nenhuma unidade cadastrada</p>
                        <p className="text-slate-400 text-sm">Clique em "Nova Unidade" para começar</p>
                    </div>
                )}
            </div>

            <UnitModal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingUnit ? 'Editar Unidade' : 'Nova Unidade'}
                unitName={unitName}
                setUnitName={setUnitName}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedMemberIds={selectedMemberIds}
                toggleSelection={toggleSelection}
                counselors={counselors}
                members={members}
                unitMap={unitMap}
                editingUnitId={editingUnit?.id}
                handleSubmit={handleSubmit}
                isSaving={createUnitMutation.isPending || updateUnitMutation.isPending}
            />
        </div>
    );
}
