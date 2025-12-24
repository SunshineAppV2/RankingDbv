import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

interface MemberRequirementsListProps {
    memberId: string;
}

export function MemberRequirementsList({ memberId }: MemberRequirementsListProps) {
    const { data: requirements = [] } = useQuery<any[]>({
        queryKey: ['member-requirements', memberId],
        queryFn: async () => {
            const response = await api.get('/requirements', { params: { userId: memberId } });
            return response.data;
        },
        enabled: !!memberId
    });

    const pendingRequirements = requirements.filter(req =>
        req.userProgress?.some((up: any) => up.status === 'PENDING')
    );

    if (pendingRequirements.length === 0) {
        return (
            <p className="text-slate-500 text-sm italic text-center py-4 border rounded-lg border-dashed">
                Nenhum requisito pendente.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
            {pendingRequirements.map(req => {
                const userProg = req.userProgress?.find((up: any) => up.status === 'PENDING');
                const hasAnswer = userProg?.answerText || userProg?.answerFileUrl;

                return (
                    <div key={req.id} className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            {req.code && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {req.code}
                                </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${hasAnswer ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                {hasAnswer ? 'Aguardando Aprovação' : 'A Fazer'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-800">{req.description}</p>
                    </div>
                );
            })}
        </div>
    );
}
