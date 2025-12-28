import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/axios';
import { Loader2, Users, Trophy, Percent, Star, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface UnitRankingDetailsModalProps {
    unitId: string | null;
    unitName: string;
    isOpen: boolean;
    onClose: () => void;
}

interface MemberContribution {
    id: string;
    name: string;
    points: number;
    photoUrl?: string;
    contribution: string;
}

interface UnitDetails {
    unitName: string;
    memberCount: number;
    totalPoints: number;
    average: number;
    members: MemberContribution[];
}

export function UnitRankingDetailsModal({ unitId, unitName, isOpen, onClose }: UnitRankingDetailsModalProps) {
    const [details, setDetails] = useState<UnitDetails | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && unitId) {
            fetchDetails();
        }
    }, [isOpen, unitId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/activities/ranking/unit-details/${unitId}`);
            setDetails(response.data);
        } catch (error) {
            console.error('Erro ao buscar detalhes da unidade:', error);
            toast.error('Não foi possível carregar os detalhes da unidade.');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalhamento: ${unitName}`} maxWidth="max-w-3xl">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-500">Calculando contribuições...</p>
                </div>
            ) : !details ? (
                <div className="text-center py-12 text-slate-500">
                    Nenhum dado encontrado.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center">
                            <span className="text-blue-600 mb-1"><Users className="w-6 h-6" /></span>
                            <span className="text-2xl font-bold text-blue-900">{details.memberCount}</span>
                            <span className="text-xs text-blue-500 uppercase font-bold tracking-wider">Membros Ativos (Até 15 anos)</span>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col items-center">
                            <span className="text-amber-600 mb-1"><Trophy className="w-6 h-6" /></span>
                            <span className="text-2xl font-bold text-amber-900">{details.totalPoints}</span>
                            <span className="text-xs text-amber-500 uppercase font-bold tracking-wider">Pontos Totais</span>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-purple-100/50" />
                            <span className="text-purple-600 mb-1 relative"><Calculator className="w-6 h-6" /></span>
                            <span className="text-2xl font-bold text-purple-900 relative">{details.average}</span>
                            <span className="text-xs text-purple-500 uppercase font-bold tracking-wider relative">Média (Pontos / Membro)</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-4 uppercase text-sm tracking-wider">
                            <Star className="w-4 h-4 text-yellow-500" />
                            Ranking de Contribuição
                        </h4>

                        <div className="space-y-3">
                            {details.members.map((member, index) => (
                                <div key={member.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                                            {index + 1}º
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{member.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">ID: {member.id.substring(0, 8)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 text-right">
                                        <div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Pontos</div>
                                            <div className="font-bold text-slate-700">{member.points}</div>
                                        </div>
                                        <div className="w-20">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-end gap-1">
                                                <Percent className="w-3 h-3" /> Contr.
                                            </div>
                                            <div className="font-bold text-blue-600">{member.contribution}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-xs text-slate-400 text-center italic">
                        * A média é calculada dividindo os <strong>Pontos Totais</strong> pela quantidade de <strong>Membros Ativos</strong> (apenas desbravadores).
                    </div>
                </div>
            )}
        </Modal>
    );
}
