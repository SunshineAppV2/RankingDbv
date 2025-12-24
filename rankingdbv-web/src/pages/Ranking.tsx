import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { RankingDetailsModal } from '../components/RankingDetailsModal';
import { Trophy, Crown, Ban } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';


interface UnitRank {
    id: string;
    name: string;
    average: number;
    totalPoints: number;
    memberCount: number;
}

interface RankedUser {
    id: string;
    name: string;
    points: number;
    email?: string;
    role?: string;
    dbvClass?: string;
    unitId?: string;
    birthDate?: string;
    club: {
        name: string;
    };
}

export function Ranking() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'pathfinders' | 'units'>('pathfinders');
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const isMaster = user?.email === 'master@rankingdbv.com';

    // Master Filters
    const [filterType, setFilterType] = useState<'GLOBAL' | 'UNION' | 'MISSION' | 'CLUB'>('GLOBAL');
    const [selectedUnion, setSelectedUnion] = useState('');
    const [selectedMission, setSelectedMission] = useState('');
    const [selectedClubId, setSelectedClubId] = useState('');

    const [hierarchyOptions, setHierarchyOptions] = useState<{ unions: string[], missions: string[] }>({ unions: [], missions: [] });
    const [clubsList, setClubsList] = useState<any[]>([]);

    // Fetch Hierarchy Options (Master Only)
    useEffect(() => {
        if (isMaster) {
            api.get('/clubs/hierarchy-options').then(res => setHierarchyOptions(res.data)).catch(console.error);
            if (filterType === 'CLUB') {
                api.get('/clubs').then(res => setClubsList(res.data)).catch(console.error);
            }
        }
    }, [isMaster, filterType]);

    // Determine Logic for Unit Ranking Fetch
    // Only fetch if User has clubId OR (Master AND selectedClubId)
    const activeClubId = isMaster ? (filterType === 'CLUB' ? selectedClubId : null) : user?.clubId;

    const { data: unitRanking = [] } = useQuery<UnitRank[]>({
        queryKey: ['unit-ranking', activeClubId],
        queryFn: async () => {
            if (!activeClubId) return [];
            const res = await api.get(`/activities/ranking/units/${activeClubId}`);
            return res.data;
        },
        enabled: !!activeClubId
    });

    const { data: ranking = [] as RankedUser[], isLoading, error } = useQuery<RankedUser[]>({
        queryKey: ['ranking', user?.clubId, filterType, selectedUnion, selectedMission, selectedClubId],
        queryFn: async () => {
            if (isMaster) {
                // Master Logic with Filters
                let params = new URLSearchParams();
                if (filterType === 'UNION' && selectedUnion) params.append('union', selectedUnion);
                if (filterType === 'MISSION' && selectedMission) params.append('mission', selectedMission);
                if (filterType === 'CLUB' && selectedClubId) params.append('clubId', selectedClubId);

                // Assuming GLOBAL uses 'GLOBAL' param or empty check in backend
                const endpoint = `/activities/ranking/GLOBAL?${params.toString()}`;
                const response = await api.get(endpoint);
                return response.data;
            } else {
                // Standard User Logic
                if (!user?.clubId) return [];
                const response = await api.get(`/activities/ranking/${user.clubId}`);
                return response.data;
            }
        },
        enabled: isMaster || !!user?.clubId
    });



    const queryClient = useQueryClient();

    const resetPointsMutation = useMutation({
        mutationFn: async (userId: string) => {
            await api.post(`/activities/reset/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            alert('Pontuação zerada com sucesso.');
        },
        onError: () => {
            alert('Erro ao zerar pontuação.');
        }
    });

    const handleReset = (userId: string) => {
        if (window.confirm('Tem certeza que deseja DESCLASSIFICAR este desbravador? A pontuação será zerada.')) {
            resetPointsMutation.mutate(userId);
        }
    };

    const getMedalColor = (index: number) => {
        switch (index) {
            case 0: return 'text-yellow-400';
            case 1: return 'text-gray-400';
            case 2: return 'text-amber-600';
            default: return 'text-slate-400';
        }
    };

    if (isLoading) return <div className="p-10 text-center">Carregando Leaderboard...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Erro ao carregar ranking.</div>;

    const allowedRoles = ['OWNER', 'ADMIN', 'DIRECTOR', 'COUNSELOR', 'INSTRUCTOR', 'MASTER', 'REGIONAL'];
    const canViewDetails = allowedRoles.includes(user?.role || '') || isMaster;

    const getAge = (dateString?: string) => {
        if (!dateString) return 0;
        const birthDate = new Date(dateString);
        if (isNaN(birthDate.getTime())) return 0;
        return new Date().getFullYear() - birthDate.getFullYear();
    };

    const rankingA = ranking.filter(u => {
        const age = getAge(u.birthDate);
        return age <= 12;
    });

    const rankingB = ranking.filter(u => {
        const age = getAge(u.birthDate);
        return age >= 13 && age <= 15;
    });

    const RankingTable = ({ title, data, colorClass }: { title: string, data: RankedUser[], colorClass: string }) => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <div className={`p-4 ${colorClass} text-white font-bold text-center uppercase tracking-wide`}>
                {title}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Pos</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Desbravador</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Pts</th>
                            {['OWNER', 'ADMIN'].includes(user?.role || '') && <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Ação</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((rankedUser, index) => (
                            <tr
                                key={rankedUser.id}
                                onClick={() => canViewDetails && (setSelectedMember(rankedUser), setIsDetailsOpen(true))}
                                className={`transition-colors ${index < 3 ? 'bg-yellow-50/30' : ''} ${canViewDetails ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                            >
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        {index < 3 ? <Crown className={`w-5 h-5 ${getMedalColor(index)}`} /> : <span className="w-5 text-center font-bold text-slate-400 text-sm">#{index + 1}</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 text-sm">{rankedUser.name}</span>
                                        <span className="text-xs text-slate-500">{rankedUser.club?.name || '-'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                    <span className="font-mono font-bold text-blue-600 text-sm">{rankedUser.points}</span>
                                </td>
                                {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                                    <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => handleReset(rankedUser.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Zerar"><Ban className="w-4 h-4" /></button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">Nenhum desbravador nesta faixa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );



    const UnitRankingSection = () => {
        if (!unitRanking || unitRanking.length === 0) return (
            <div className="text-center py-10 text-slate-400">
                <p>Nenhuma unidade pontuou ainda nesta temporada.</p>
            </div>
        );

        const medals = [
            { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', icon: 'text-yellow-500' }, // Gold
            { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', icon: 'text-slate-400' },     // Silver
            { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', icon: 'text-orange-600' }  // Bronze
        ];

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Top 3 Cards */}
                    {unitRanking.slice(0, 3).map((unit, index) => (
                        <div key={unit.id} className={`${medals[index].bg} border-2 ${medals[index].border} rounded-xl p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden transform hover:-translate-y-1 transition-transform cursor-default`}>
                            <Crown className={`w-12 h-12 ${medals[index].icon} mb-3`} />

                            <span className={`text-xs font-bold ${medals[index].text} uppercase tracking-widest mb-2 px-3 py-1 bg-white/50 rounded-full`}>{index + 1}º Lugar</span>

                            <h3 className={`text-xl font-bold ${medals[index].text} mb-1`}>{unit.name}</h3>

                            <div className="my-3">
                                <span className="font-bold text-slate-800 text-4xl tracking-tighter">{unit.average}</span>
                                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Pontos / Membro</div>
                            </div>

                            <div className="w-full h-px bg-slate-200/50 my-2" />

                            <p className="text-xs text-slate-600 font-medium opacity-80">
                                Total: {unit.totalPoints} pts • {unit.memberCount} membros
                            </p>

                            <Trophy className={`w-24 h-24 ${medals[index].icon} opacity-10 absolute -right-6 -bottom-6 rotate-12`} />
                        </div>
                    ))}
                </div>

                {/* Others List */}
                {unitRanking.length > 3 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Demais Unidades</h4>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {unitRanking.slice(3).map((unit, idx) => (
                                <div key={unit.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono font-bold text-slate-400 text-lg w-8 text-center">#{idx + 4}</span>
                                        <span className="font-bold text-slate-700 text-lg">{unit.name}</span>
                                    </div>
                                    <div className="flex items-center gap-6 text-right">
                                        <div className="hidden sm:block">
                                            <div className="text-xs text-slate-400 uppercase font-bold">Membros</div>
                                            <div className="font-semibold text-slate-600">{unit.memberCount}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400 uppercase font-bold">Média</div>
                                            <div className="font-bold text-blue-600 text-xl">{unit.average}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto">
            {isMaster && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center">
                    <span className="font-bold text-slate-700 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">👑 MASTER VIEW</span>

                    <select
                        value={filterType}
                        onChange={(e) => { setFilterType(e.target.value as any); setSelectedUnion(''); setSelectedMission(''); setSelectedClubId(''); }}
                        className="p-2 border rounded text-sm font-medium"
                    >
                        <option value="GLOBAL">🌎 Todos (Global)</option>
                        <option value="UNION">🏛️ Por União</option>
                        <option value="MISSION">📍 Por Missão</option>
                        <option value="CLUB">⛺ Por Clube</option>
                    </select>

                    {filterType === 'UNION' && (
                        <select value={selectedUnion} onChange={e => setSelectedUnion(e.target.value)} className="p-2 border rounded text-sm">
                            <option value="">Selecione a União...</option>
                            {hierarchyOptions.unions.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    )}

                    {filterType === 'MISSION' && (
                        <select value={selectedMission} onChange={e => setSelectedMission(e.target.value)} className="p-2 border rounded text-sm">
                            <option value="">Selecione a Missão...</option>
                            {hierarchyOptions.missions.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    )}

                    {filterType === 'CLUB' && (
                        <select value={selectedClubId} onChange={e => setSelectedClubId(e.target.value)} className="p-2 border rounded text-sm max-w-xs">
                            <option value="">Selecione o Clube...</option>
                            {clubsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                </div>
            )}

            {/* HEADER UNIFICADO COM TABS */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl pt-8 px-4 pb-0 mb-8 text-white shadow-lg overflow-hidden flex flex-col items-center">
                <div className="flex flex-col items-center gap-2 mb-8 text-center">
                    <div className="bg-white/10 p-3 rounded-full mb-2 backdrop-blur-sm">
                        <Trophy className="w-8 h-8 text-yellow-300" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-widest text-white drop-shadow-sm">Ranking Geral</h1>
                        <p className="text-blue-100 font-medium opacity-80">Acompanhamento de Desempenho</p>
                    </div>
                </div>

                <div className="flex w-full max-w-2xl">
                    <button
                        onClick={() => setActiveTab('pathfinders')}
                        className={`flex-1 py-4 text-center font-bold uppercase tracking-wider text-sm sm:text-base transition-all relative ${activeTab === 'pathfinders' ? 'text-white' : 'text-blue-300 hover:text-white hover:bg-white/5'}`}
                    >
                        Top Desbravadores
                        {activeTab === 'pathfinders' && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-t-full shadow-[0_-2px_10px_rgba(250,204,21,0.5)]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('units')}
                        className={`flex-1 py-4 text-center font-bold uppercase tracking-wider text-sm sm:text-base transition-all relative ${activeTab === 'units' ? 'text-white' : 'text-blue-300 hover:text-white hover:bg-white/5'}`}
                    >
                        Top Unidades
                        {activeTab === 'units' && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-t-full shadow-[0_-2px_10px_rgba(250,204,21,0.5)]" />
                        )}
                    </button>
                </div>
            </div>

            {/* CONTEUDO DAS ABAS */}
            {activeTab === 'pathfinders' ? (
                <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <RankingTable
                        title="Faixa A (10 a 12 Anos)"
                        data={rankingA}
                        colorClass="bg-blue-500"
                    />
                    <RankingTable
                        title="Faixa B (13 a 15 Anos)"
                        data={rankingB}
                        colorClass="bg-indigo-600"
                    />
                </div>
            ) : (
                <UnitRankingSection />
            )}

            <RankingDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} userId={selectedMember?.id} userName={selectedMember?.name} />
        </div>
    );
}
