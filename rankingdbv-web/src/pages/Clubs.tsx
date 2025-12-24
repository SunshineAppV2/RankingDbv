
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Shield, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';

interface Club {
    id: string;
    name: string;
    _count: {
        users: number;
    };
}

export function Clubs() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form and Editing State
    const [editingClub, setEditingClub] = useState<Club | null>(null);
    const [clubName, setClubName] = useState('');

    const { data: clubs = [], isLoading } = useQuery<Club[]>({
        queryKey: ['clubs'],
        queryFn: async () => {
            const response = await api.get('/clubs');
            return response.data;
        }
    });

    // --- Mutations ---

    const createClubMutation = useMutation({
        mutationFn: async (name: string) => {
            const response = await api.post('/clubs', { name });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
            closeModal();
        },
        onError: (err) => {
            console.error(err);
            alert('Erro ao criar clube.');
        }
    });

    const updateClubMutation = useMutation({
        mutationFn: async (data: { id: string, name: string }) => {
            const response = await api.put(`/clubs/${data.id}`, { name: data.name });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
            closeModal();
        },
        onError: (err) => {
            console.error(err);
            alert('Erro ao atualizar clube.');
        }
    });

    const deleteClubMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/clubs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
        },
        onError: (err) => {
            console.error(err);
            alert('Erro ao excluir clube. Verifique se existem membros vinculados.');
        }
    });

    // --- Handlers ---

    const openCreateModal = () => {
        setEditingClub(null);
        setClubName('');
        setIsModalOpen(true);
    };

    const openEditModal = (club: Club) => {
        setEditingClub(club);
        setClubName(club.name);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingClub(null);
        setClubName('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingClub) {
            updateClubMutation.mutate({
                id: editingClub.id,
                name: clubName
            });
        } else {
            createClubMutation.mutate(clubName);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Deseja realmente excluir este clube?')) {
            deleteClubMutation.mutate(id);
        }
    };

    if (isLoading) return <div className="p-10 text-center">Carregando Clubes...</div>;

    const isSaving = createClubMutation.isPending || updateClubMutation.isPending;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Clubes Parceiros</h1>
                <button
                    onClick={openCreateModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Novo Clube
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubs.map((club) => (
                    <div key={club.id} className="relative bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow group">

                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => openEditModal(club)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(club.id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                            <Shield className="w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{club.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-auto pt-4">
                            <Users className="w-4 h-4" />
                            <span>{club._count?.users || 0} Membros</span>
                        </div>
                    </div>
                ))}

                {clubs.length === 0 && (
                    <div className="col-span-full p-10 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                        Nenhum clube cadastrado ainda.
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingClub ? 'Editar Clube' : 'Novo Clube'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Clube</label>
                        <input
                            type="text"
                            required
                            value={clubName}
                            onChange={e => setClubName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Clube de Desbravadores..."
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
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Clube'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
