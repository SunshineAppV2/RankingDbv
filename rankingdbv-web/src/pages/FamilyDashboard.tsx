import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, User, Award, Shield, Calendar } from 'lucide-react';
import { Modal } from '../components/Modal';

interface Child {
    id: string;
    name: string;
    points: number;
    dbvClass?: string;
    unit?: { name: string };
    attendances: any[];
    specialties: any[];
}

export function FamilyDashboard() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [childEmail, setChildEmail] = useState('');

    const { data: children = [], isLoading } = useQuery<Child[]>({
        queryKey: ['children', user?.id],
        queryFn: async () => {
            const response = await api.get(`/users/family/children/${user?.id}`);
            return response.data;
        },
        enabled: !!user?.id
    });

    const linkChildMutation = useMutation({
        mutationFn: async (email: string) => {
            return api.post('/users/family/link', { parentId: user?.id, childEmail: email });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['children'] });
            setIsLinkModalOpen(false);
            setChildEmail('');
            alert('Filho vinculado com sucesso!');
        },
        onError: () => {
            alert('Erro ao vincular. Verifique o email.');
        }
    });

    const handleLinkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        linkChildMutation.mutate(childEmail);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Minha Família</h1>
                <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Vincular Filho
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-10">Carregando...</div>
            ) : children.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">Nenhum filho vinculado</h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                        Adicione seus filhos usando o email cadastrado deles para acompanhar o progresso.
                    </p>
                    <button
                        onClick={() => setIsLinkModalOpen(true)}
                        className="text-blue-600 font-medium hover:underline"
                    >
                        Vincular agora
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {children.map(child => (
                        <div key={child.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex items-center gap-4 text-white">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                                    {child.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{child.name}</h3>
                                    <div className="flex items-center gap-2 text-blue-100 text-sm">
                                        <Shield className="w-3 h-3" />
                                        <span>{child.unit?.name || 'Sem Unidade'}</span>
                                        <span>•</span>
                                        <span>{child.dbvClass || 'Sem Classe'}</span>
                                    </div>
                                </div>
                                <div className="ml-auto text-center">
                                    <span className="block text-2xl font-bold">{child.points}</span>
                                    <span className="text-xs uppercase opacity-80">Pontos</span>
                                </div>
                            </div>

                            <div className="p-4 grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Presenças</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">{child.attendances?.length || 0}</p>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                        <Award className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Especialidades</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">{child.specialties?.length || 0}</p>
                                </div>
                            </div>

                            {child.specialties && child.specialties.length > 0 && (
                                <div className="px-4 pb-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Últimas Conquistas</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {child.specialties.slice(0, 3).map((s: any) => (
                                            <span key={s.id} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-100 flex items-center gap-1">
                                                <Award className="w-3 h-3" />
                                                {s.specialty?.name}
                                            </span>
                                        ))}
                                        {child.specialties.length > 3 && (
                                            <span className="text-xs text-slate-400 py-1">+ {child.specialties.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Vincular Filho">
                <form onSubmit={handleLinkSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email do Filho</label>
                        <input
                            type="email"
                            required
                            value={childEmail}
                            onChange={e => setChildEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="email@do-filho.com"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            O desbravador já deve ter um cadastro no sistema com este email.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsLinkModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={linkChildMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                            {linkChildMutation.isPending ? 'Vinculando...' : 'Vincular'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
