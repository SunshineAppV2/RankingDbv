import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { User } from 'lucide-react';
import { AdminSpecialtyReviewModal } from '../components/AdminSpecialtyReviewModal';

interface DashboardResponse {
    specialties: {
        id: string;
        name: string;
        area: string;
        imageUrl?: string;
        totalRequirements: number;
        members: {
            id: string;
            name: string;
            photoUrl?: string;
            progress: number;
            status: string;
            rank: string;
        }[];
    }[];
    allUsers: {
        id: string;
        name: string;
        photoUrl?: string;
        role: string;
        activeSpecialtiesCount: number;
    }[];
}

const AREA_COLORS: Record<string, string> = {
    'Natureza': 'bg-green-100 text-green-700 border-green-200',
    'Artes': 'bg-purple-100 text-purple-700 border-purple-200',
    'Missionárias': 'bg-blue-100 text-blue-700 border-blue-200',
    'Recreativas': 'bg-orange-100 text-orange-700 border-orange-200',
    'Ciência': 'bg-red-100 text-red-700 border-red-200',
    'Domésticas': 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

function getAreaColor(area: string) {
    const key = Object.keys(AREA_COLORS).find(k => area.includes(k));
    return key ? AREA_COLORS[key] : 'bg-blue-100 text-blue-700 border-blue-200';
}

export function SpecialtiesDashboard() {
    const { user } = useAuth();
    const [selectedReview, setSelectedReview] = useState<{
        context: { type: 'SPECIALTY', id: string, title: string },
        member: any
    } | null>(null);

    const { data, isLoading } = useQuery<DashboardResponse>({
        queryKey: ['specialties-dashboard', user?.clubId],
        queryFn: async () => (await api.get('/specialties/dashboard')).data,
        enabled: !!user?.clubId
    });

    const isAdmin = ['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(user?.role || '');

    const handleMemberClick = (member: any, specialty: any) => {
        if (!isAdmin) return;
        setSelectedReview({
            context: {
                type: 'SPECIALTY',
                id: specialty.id,
                title: specialty.name
            },
            member
        });
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Carregando painel...</div>;

    const unspecialized = data?.allUsers.filter(u => u.activeSpecialtiesCount === 0) || [];
    const activeSpecialties = (data?.specialties || [])
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)]">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h1 className="text-2xl font-bold text-slate-800">Especialidades em Andamento</h1>
            </div>

            <div className="flex-1 flex overflow-x-auto pb-6 gap-6 scrollbar-thin scrollbar-thumb-slate-300">
                {/* Column: Without Specialty */}
                <div className="min-w-[280px] bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col h-full shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2 shrink-0">
                        <span className="font-bold text-slate-600 text-sm px-2 py-1 bg-slate-200 rounded">
                            Sem Especialidade
                        </span>
                        <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium ml-auto">
                            {unspecialized.length}
                        </span>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                        {unspecialized.map(m => (
                            <div key={m.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center group hover:border-blue-300 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-slate-700 text-xs truncate max-w-[120px]">
                                        {m.name}
                                    </span>
                                </div>
                                <button
                                    onClick={() => window.location.href = '/dashboard/specialties'}
                                    className="text-[10px] text-blue-600 hover:bg-blue-100 px-2 py-1 rounded font-bold uppercase transition-colors"
                                >
                                    Iniciar
                                </button>
                            </div>
                        ))}
                        {unspecialized.length === 0 && (
                            <p className="text-center text-slate-400 text-xs mt-10 italic">Nenhum membro sem especialidade.</p>
                        )}
                    </div>
                </div>

                {/* Columns: Active Specialties */}
                {activeSpecialties.map((specialty) => {
                    const colorClasses = getAreaColor(specialty.area || 'Geral');
                    const borderColor = colorClasses.split(' ').find(c => c.startsWith('border-')) || 'border-blue-200';

                    return (
                        <div key={specialty.id} className="min-w-[280px] bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col h-full shadow-sm">
                            <div className={`flex items-center justify-between mb-4 border-b pb-2 shrink-0 ${borderColor}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {specialty.imageUrl && (
                                        <img src={specialty.imageUrl} alt="" className="w-4 h-4 object-contain shrink-0" />
                                    )}
                                    <span className={`font-bold text-[11px] px-2 py-1 rounded uppercase truncate ${colorClasses}`}>
                                        {specialty.name}
                                    </span>
                                </div>
                                <span className="text-slate-400 text-xs font-medium ml-2 shrink-0">
                                    {specialty.members.length}
                                </span>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                                {specialty.members.map(member => (
                                    <div
                                        key={member.id}
                                        className={`bg-white p-3 rounded-lg shadow-sm border border-slate-200 group relative ${isAdmin ? 'cursor-pointer hover:border-blue-300 transition-colors' : ''}`}
                                        onClick={() => handleMemberClick(member, specialty)}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${colorClasses}`}>
                                                {member.photoUrl ? (
                                                    <img src={member.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    member.name.charAt(0)
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-800 text-xs truncate">{member.name}</p>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full shrink-0">
                                                {member.progress}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedReview && (
                <AdminSpecialtyReviewModal
                    isOpen={!!selectedReview}
                    onClose={() => setSelectedReview(null)}
                    context={selectedReview.context}
                    member={selectedReview.member}
                />
            )}
        </div>
    );
}
