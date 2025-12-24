
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { User, Award, ArrowRight, Shield } from 'lucide-react';
import { MemberDetailsModal } from '../components/MemberDetailsModal';

const groupByArea = (reqs: any[]) => {
    return reqs.reduce((groups: any, req: any) => {
        const area = req.requirement.area || 'Geral';
        if (!groups[area]) {
            groups[area] = [];
        }
        groups[area].push(req);
        return groups;
    }, {});
};

export function ChildActivities() {
    const { user } = useAuth();
    const [selectedChild, setSelectedChild] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: children = [], isLoading } = useQuery({
        queryKey: ['children', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const response = await api.get(`/users/family/children/${user.id}`);
            return response.data;
        },
        enabled: !!user?.id
    });

    const handleOpenDetails = (child: any) => {
        // Map child data to Member interface expected by modal
        const memberData = {
            id: child.id,
            name: child.name,
            email: child.email || '',
            role: 'Desbravador', // Display role usually
            dbvClass: child.dbvClass,
            unitId: child.unit?.id
        };
        setSelectedChild(memberData);
        setIsModalOpen(true);
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Carregando atividades...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-8 h-8 text-blue-600" />
                Atividades do Filho
            </h1>

            <div className="space-y-8">
                {children.map((child: any) => {
                    const reqs = child.requirements || [];
                    const realizados = reqs.filter((r: any) => r.status === 'APPROVED' || r.status === 'COMPLETED');
                    const aguardando = reqs.filter((r: any) => r.status === 'PENDING' && (r.answerText || r.answerFileUrl));
                    const pendentes = reqs.filter((r: any) => r.status === 'PENDING' && !r.answerText && !r.answerFileUrl);

                    return (
                        <div key={child.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Header / Profile */}
                            <div className="bg-slate-50 p-6 border-b border-slate-100 flex flex-col md:flex-row items-center gap-6">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-400 border-4 border-slate-200 shadow-sm shrink-0">
                                    {child.photoUrl ? (
                                        <img src={child.photoUrl} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10" />
                                    )}
                                </div>
                                <div className="text-center md:text-left flex-1">
                                    <h3 className="text-xl font-bold text-slate-800">{child.name}</h3>
                                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-500 mt-1">
                                        <Shield className="w-4 h-4" />
                                        <span>{child.unit?.name || 'Sem Unidade'}</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {child.dbvClass || 'Sem Classe'}
                                        </span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {child.points} Pontos
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    <button
                                        onClick={() => handleOpenDetails(child)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-200"
                                    >
                                        Ver Detalhes Totais
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Activities Lists */}
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                                {/* Done */}
                                <div className="p-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-green-600 uppercase mb-4">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        Realizados ({realizados.length})
                                    </h4>
                                    <div className="space-y-4">
                                        {realizados.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma atividade realizada.</p>}
                                        {Object.entries(groupByArea(realizados)).map(([area, items]: any) => (
                                            <div key={area}>
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">{area || 'Geral'}</h5>
                                                <ul className="space-y-2">
                                                    {items.map((r: any) => (
                                                        <li key={r.id} className="text-sm text-slate-700 bg-green-50 p-2 rounded border border-green-100">
                                                            <span className="font-bold text-xs text-green-700 mr-1">{r.requirement.code}</span>
                                                            {r.requirement.description}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Waiting */}
                                <div className="p-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-yellow-600 uppercase mb-4">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        Aguardando ({aguardando.length})
                                    </h4>
                                    <div className="space-y-4">
                                        {aguardando.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma aprovação pendente.</p>}
                                        {Object.entries(groupByArea(aguardando)).map(([area, items]: any) => (
                                            <div key={area}>
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">{area || 'Geral'}</h5>
                                                <ul className="space-y-2">
                                                    {items.map((r: any) => (
                                                        <li key={r.id} className="text-sm text-slate-700 bg-yellow-50 p-2 rounded border border-yellow-100">
                                                            <span className="font-bold text-xs text-yellow-700 mr-1">{r.requirement.code}</span>
                                                            {r.requirement.description}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Pending / To Do */}
                                <div className="p-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase mb-4">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        Pendentes ({pendentes.length})
                                    </h4>
                                    <div className="space-y-4">
                                        {pendentes.length === 0 && <p className="text-xs text-slate-400 italic">Tudo em dia!</p>}
                                        {Object.entries(groupByArea(pendentes)).map(([area, items]: any) => (
                                            <div key={area}>
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">{area || 'Geral'}</h5>
                                                <ul className="space-y-2">
                                                    {items.map((r: any) => (
                                                        <li key={r.id} className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                                                            <span className="font-bold text-xs text-slate-500 mr-1">{r.requirement.code}</span>
                                                            {r.requirement.description}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {children.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">Nenhum filho encontrado</h3>
                    <p className="text-slate-500">Solicite o vínculo com seu filho na tela Principal.</p>
                </div>
            )}

            <MemberDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                member={selectedChild}
            />
        </div>
    );
}
