import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useQuery } from '@tanstack/react-query';
import { Modal } from './Modal';
import { toast } from 'sonner';
import { User as UserIcon, Lock, Shield, Pencil, Save, X, Key, Globe, Building2 } from 'lucide-react';
import { ROLE_TRANSLATIONS } from '../pages/members/types';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    mustChangePassword?: boolean;
}

interface Club {
    id: string;
    name: string;
    union?: string;
    mission?: string;
    region?: string;
}

interface EditClubModalProps {
    club: Club;
    onClose: () => void;
    onSave: () => void;
}

export function EditClubModal({ club, onClose, onSave }: EditClubModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        union: '',
        mission: '',
        region: '',
        district: '',
        association: ''
    });

    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Member Editing State
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editMustChangePassword, setEditMustChangePassword] = useState(false);
    const [savingUser, setSavingUser] = useState(false);

    useEffect(() => {
        if (club) {
            setFormData({
                name: club.name || '',
                union: club.union || '',
                mission: club.mission || '',
                region: club.region || '',
                district: (club as any).district || '',
                association: (club as any).association || ''
            });
            fetchMembers();
        }
    }, [club]);

    // Fetch Supervised Clubs (Clubs in the same region/association)
    const { data: supervisedClubs = [], isLoading: isLoadingSupervised } = useQuery({
        queryKey: ['supervised-clubs', formData.region, formData.association],
        queryFn: async () => {
            if (!formData.region) return [];
            // We use the dashboard or find endpoint with filters
            const res = await api.get('/clubs');
            // Filter locally or if API supports it, use query params
            return res.data.filter((c: any) =>
                c.id !== club.id && // Don't list itself
                c.region === formData.region &&
                (!formData.association || c.association === formData.association)
            );
        },
        enabled: !!formData.region
    });

    const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
            const res = await api.get(`/users?clubId=${club.id}`);
            setMembers(res.data);
        } catch (error) {
            toast.error('Erro ao carregar membros do clube.');
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleSaveClub = async () => {
        if (!formData.name) return toast.error('O nome do clube é obrigatório.');
        setLoading(true);
        try {
            await api.put(`/clubs/${club.id}`, formData);
            toast.success('Informações do clube atualizadas!');
            onSave();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao atualizar clube.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUserId(user.id);
        setEditName(user.name);
        setEditPassword('');
        setEditMustChangePassword(user.mustChangePassword || false);
    };

    const handleSaveUser = async (userId: string) => {
        if (!editName) return toast.error('O nome é obrigatório.');
        setSavingUser(true);
        try {
            const updateData: any = { name: editName, mustChangePassword: editMustChangePassword };
            if (editPassword) updateData.password = editPassword;

            await api.patch(`/users/${userId}`, updateData);
            toast.success('Membro atualizado com sucesso!');
            setEditingUserId(null);
            fetchMembers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao atualizar membro.');
        } finally {
            setSavingUser(false);
        }
    };

    const handlePromoteToDirector = async (newDirectorId: string) => {
        if (!confirm('Deseja realmente tornar este membro o novo DIRETOR do clube? O diretor atual será rebaixado para Administrador.')) return;

        setSavingUser(true);
        try {
            // 1. If there's a current director (OWNER), demote them to ADMIN
            if (director) {
                await api.patch(`/users/${director.id}`, { role: 'ADMIN' });
            }

            // 2. Promote the selected user to OWNER
            await api.patch(`/users/${newDirectorId}`, { role: 'OWNER' });

            toast.success('Diretoria do clube atualizada!');
            fetchMembers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao trocar diretor.');
        } finally {
            setSavingUser(false);
        }
    };

    // Find the Director (OWNER)
    const director = members.find(m => m.role === 'OWNER');
    const otherMembers = members.filter(m => m.role !== 'OWNER');

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Configurações do Clube: ${club.name}`}
        >
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar" translate="no">

                {/* --- SEÇÃO 1: DADOS DO CLUBE --- */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Informações do Clube
                    </h4>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Clube</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">União</label>
                            <input
                                type="text"
                                value={formData.union}
                                onChange={e => setFormData({ ...formData, union: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Associação (Geral)</label>
                            <input
                                type="text"
                                value={formData.association}
                                onChange={e => setFormData({ ...formData, association: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Missão/Assoc. Local</label>
                            <input
                                type="text"
                                value={formData.mission}
                                onChange={e => setFormData({ ...formData, mission: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Região</label>
                            <input
                                type="text"
                                value={formData.region}
                                onChange={e => setFormData({ ...formData, region: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Distrito</label>
                            <input
                                type="text"
                                value={formData.district}
                                onChange={e => setFormData({ ...formData, district: e.target.value })}
                                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveClub}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            {loading ? 'Salvando...' : <><Save className="w-4 h-4" /> Atualizar Clube</>}
                        </button>
                    </div>
                </div>

                {/* --- SEÇÃO CLUBES SUPERVISIONADOS (Para Regionais/Distritais) --- */}
                {(club.name.toUpperCase().includes('REGIONAL') || club.name.toUpperCase().includes('DISTRITO')) && (
                    <div className="border-t pt-6 space-y-4">
                        <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Clubes Supervisionados ({supervisedClubs.length})
                        </h4>
                        <p className="text-[11px] text-slate-500 italic">
                            Estes são os clubes que pertencem à {formData.region} / {formData.association}.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {supervisedClubs.map((c: any) => (
                                <div key={c.id} className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-100 group">
                                    <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden text-[10px] text-slate-400">
                                        {c.logoUrl ? <img src={c.logoUrl} className="w-full h-full object-cover" /> : 'DBV'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-700 truncate">{c.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{c.mission} / {c.district || 'Sem Distrito'}</div>
                                    </div>
                                    <Globe className="w-3 h-3 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                            ))}
                            {supervisedClubs.length === 0 && !isLoadingSupervised && (
                                <div className="col-span-2 text-center py-4 text-xs text-slate-400 italic">
                                    Nenhum outro clube encontrado nesta jurisdição.
                                </div>
                            )}
                            {isLoadingSupervised && (
                                <div className="col-span-2 text-center py-4 text-xs text-slate-400 italic">
                                    Buscando clubes...
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="border-t pt-6" />

                {/* --- SEÇÃO 2: DIRETORIA (DESTAQUE) --- */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                        <Key className="w-4 h-4" /> Direção do Clube
                    </h4>
                    {loadingMembers ? (
                        <div className="text-center py-4 text-slate-400 text-sm">Carregando diretoria...</div>
                    ) : director ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            {editingUserId === director.id ? (
                                <UserEditField
                                    name={editName}
                                    password={editPassword}
                                    mustChangePassword={editMustChangePassword}
                                    setName={setEditName}
                                    setPassword={setEditPassword}
                                    setMustChangePassword={setEditMustChangePassword}
                                    onSave={() => handleSaveUser(director.id)}
                                    onCancel={() => setEditingUserId(null)}
                                    loading={savingUser}
                                />
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-amber-700">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{director.name} <span className="text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded ml-2">{ROLE_TRANSLATIONS[director.role] || director.role}</span></div>
                                            <div className="text-xs text-slate-500">{director.email}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleEditUser(director)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 italic">Nenhum diretor (Owner) identificado neste clube.</div>
                    )}
                </div>

                {/* --- SEÇÃO 3: OUTROS MEMBROS --- */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <UserIcon className="w-4 h-4" /> Outros Membros ({otherMembers.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {otherMembers.map(member => (
                            <div key={member.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                                {editingUserId === member.id ? (
                                    <UserEditField
                                        name={editName}
                                        password={editPassword}
                                        mustChangePassword={editMustChangePassword}
                                        setName={setEditName}
                                        setPassword={setEditPassword}
                                        setMustChangePassword={setEditMustChangePassword}
                                        onSave={() => handleSaveUser(member.id)}
                                        onCancel={() => setEditingUserId(null)}
                                        loading={savingUser}
                                    />
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                                                <UserIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-700">{member.name}</div>
                                                <div className="text-[10px] text-slate-400 font-medium uppercase">{ROLE_TRANSLATIONS[member.role] || member.role} • {member.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handlePromoteToDirector(member.id)}
                                                className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors"
                                                title="Tornar Diretor"
                                            >
                                                <Shield className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleEditUser(member)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </Modal >
    );
}

function UserEditField({ name, password, mustChangePassword, setName, setPassword, setMustChangePassword, onSave, onCancel, loading }: any) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all animate-in fade-in slide-in-from-top-2">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nome do Membro</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nova Senha (deixar em branco se não mudar)</label>
                    <div className="relative">
                        <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            placeholder="••••••••"
                            onChange={e => setPassword(e.target.value)}
                            className="w-full pl-7 pr-2 py-1.5 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                    </div>
                </div>
            </div>
            {/* Temporary Password Checkbox */}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="mustChange"
                    checked={mustChangePassword}
                    onChange={e => setMustChangePassword(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="mustChange" className="text-xs text-slate-600 font-medium cursor-pointer">
                    Obrigar troca de senha no próximo login (Senha Temporária)
                </label>
            </div>

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-3 py-1 text-xs text-slate-500 hover:bg-white rounded transition-colors flex items-center gap-1">
                    <X className="w-3 h-3" /> Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm"
                >
                    {loading ? 'Salvando...' : <><Save className="w-3 h-3" /> Salvar</>}
                </button>
            </div>
        </form>
    );
}
