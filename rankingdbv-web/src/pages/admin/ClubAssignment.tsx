import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { toast } from 'sonner';
import { Users, Building2, Save } from 'lucide-react';
import { ROLE_TRANSLATIONS } from '../members/types';

interface AvailableDirector {
    id: string;
    name: string;
    email: string;
    role: string;
}

export function ClubAssignment() {
    const queryClient = useQueryClient();
    const [selectedDirector, setSelectedDirector] = useState<AvailableDirector | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        region: '',
        mission: '',
        union: '',
    });

    // Fetch Available Directors
    const { data: directors, isLoading } = useQuery<AvailableDirector[]>({
        queryKey: ['available-directors'],
        queryFn: async () => {
            const res = await api.get('/users/available-directors');
            return res.data;
        }
    });

    // Create Club Mutation
    const createClubMutation = useMutation({
        mutationFn: async () => {
            if (!selectedDirector) throw new Error('Selecione um diretor');

            const payload = {
                createClubDto: { // Nesting as per Backend Body decorator
                    ...formData
                },
                ownerId: selectedDirector.id
            };

            await api.post('/clubs/assign-owner', payload);
        },
        onSuccess: () => {
            toast.success(`Clube criado e atribuído a ${selectedDirector?.name}!`);
            setFormData({ name: '', region: '', mission: '', union: '' });
            setSelectedDirector(null);
            queryClient.invalidateQueries({ queryKey: ['available-directors'] });
        },
        onError: (error) => {
            toast.error('Erro ao criar clube.');
            console.error(error);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !selectedDirector) return;
        createClubMutation.mutate();
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    Atribuição de Clubes
                </h1>
                <p className="text-gray-600">
                    Crie clubes para diretores que já estão cadastrados na plataforma.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: List of Directors */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-500" />
                        Diretores Sem Clube
                    </h2>

                    {isLoading ? (
                        <p>Carregando...</p>
                    ) : directors?.length === 0 ? (
                        <p className="text-gray-500 italic">Nenhum diretor sem clube encontrado.</p>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {directors?.map(director => (
                                <button
                                    key={director.id}
                                    onClick={() => setSelectedDirector(director)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedDirector?.id === director.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="font-medium">{director.name}</div>
                                    <div className="text-sm text-gray-500">{director.email}</div>
                                    <div className="text-xs bg-gray-200 inline-block px-2 py-0.5 rounded mt-1 text-gray-700">
                                        {ROLE_TRANSLATIONS[director.role] || director.role}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-4 border-b pb-2">
                        {selectedDirector
                            ? `Criar Clube para: ${selectedDirector.name}`
                            : 'Selecione um Diretor ao lado'}
                    </h2>

                    <form onSubmit={handleSubmit} className={`space-y-4 ${!selectedDirector ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Clube</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Clube Águias"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Região</label>
                            <input
                                type="text"
                                value={formData.region}
                                onChange={e => setFormData({ ...formData, region: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Missão/Associação</label>
                            <input
                                type="text"
                                value={formData.mission}
                                onChange={e => setFormData({ ...formData, mission: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">União</label>
                            <input
                                type="text"
                                value={formData.union}
                                onChange={e => setFormData({ ...formData, union: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={createClubMutation.isPending || !selectedDirector}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                        >
                            {createClubMutation.isPending ? 'Criando...' : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Criar e Vincular
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
