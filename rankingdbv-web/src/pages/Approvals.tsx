import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, User as UserIcon, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'PENDING' | 'ACTIVE' | 'BLOCKED';
    photoUrl?: string;
}

export function Approvals() {
    const { user } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users');

            // Logic: 
            // - Master sees NEW CLUBS (Owners)
            // - Club Admins see NEW MEMBERS (Non-Owners)
            const isMaster = user?.email === 'master@rankingdbv.com';

            const pending = response.data.filter((u: any) => {
                if (u.status !== 'PENDING') return false;

                if (isMaster) {
                    return u.role === 'OWNER'; // Master validates new Clubs/Owners
                } else {
                    return u.role !== 'OWNER'; // Admins validate Members
                }
            });

            setPendingUsers(pending);
        } catch (error) {
            console.error('Error fetching pending users:', error);
            toast.error('Erro ao buscar solicitações.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (userId: string, name: string) => {
        try {
            // Update status to ACTIVE
            await api.patch(`/users/${userId}`, { status: 'ACTIVE', isActive: true });
            toast.success(`${name} aprovado com sucesso!`);
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error approving user:', error);
            toast.error('Erro ao aprovar usuário.');
        }
    };

    const handleReject = async (userId: string) => {
        if (!confirm('Tem certeza que deseja rejeitar e remover esta solicitação?')) return;

        try {
            // Delete the user record? Or block? Usually reject = delete for clean DB
            // Assuming we allow delete. If not, standard implies block.
            // Let's trying deleting since they are pending and have no data.
            // Check if backend supports delete.
            // If delete not exposed, we set to BLOCKED.
            // Start with BLOCKED for safety, or check if we have a delete endpoint. 
            // ClubsService has delete, UsersService?? Let's check keys.
            // Usually safest is to block or have a specific reject logic.
            // I'll set to BLOCKED for now, and maybe later ask.
            await api.patch(`/users/${userId}`, { status: 'BLOCKED', isActive: false });
            toast.success('Solicitação rejeitada.');
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error rejecting user:', error);
            toast.error('Erro ao rejeitar solicitação.');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Carregando solicitações...</div>;
    }

    if (pendingUsers.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Tudo em dia!</h2>
                <p className="text-slate-500">Nenhuma solicitação pendente no momento.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-orange-500" />
                Aprovações Pendentes
            </h1>

            <div className="grid gap-4">
                {pendingUsers.map(user => (
                    <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                                {user.photoUrl ? (
                                    <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-6 h-6 text-slate-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{user.name}</h3>
                                <p className="text-sm text-slate-500">{user.email}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                    {user.role}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleReject(user.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Rejeitar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleApprove(user.id, user.name)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
                            >
                                <Check className="w-4 h-4" />
                                Aprovar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
