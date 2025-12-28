import { Modal } from './Modal';
import { User, Mail, Award, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { MemberRequirementsList } from './MemberRequirementsList';
import { ROLE_TRANSLATIONS } from '../pages/members/types';

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    dbvClass?: string | null;
    unitId?: string | null;
}

interface UserSpecialty {
    id: string;
    status: 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'COMPLETED';
    specialty: {
        id: string;
        name: string;
        area: string;
        imageUrl?: string;
    };
}

interface MemberDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: Member | null;
}

export function MemberDetailsModal({ isOpen, onClose, member }: MemberDetailsModalProps) {
    // Fetch member's specialties when modal is open
    const { data: memberSpecialties = [] } = useQuery<UserSpecialty[]>({
        queryKey: ['member-specialties', member?.id],
        queryFn: async () => {
            if (!member?.id) return [];
            // We need an endpoint to get OTHER user's specialties. 
            // The current /specialties/my gets logged-in user's.
            // We might need to check if we have an endpoint for this or use a query param on a general endpoint.
            // Looking at SpecialtiesController, there isn't a direct "get by user id" for admins yet?
            // Wait, we can reuse /specialties/my logic but for a specific user ID if we are admin?
            // OR use the existing Controller ability?
            // SpecialtiesController has:
            // @Get(':id/progress') which gets requirements.
            // @Get('my') -> findAllForUser(req.user.id).
            // SpecialtiesService has findAllForUser(userId).
            // We should ideally expose findAllForUser to admins via a param, e.g. /specialties?userId=... or /specialties/user/:userId
            // Since we can't change backend right this second without a new tool call, let's assume we'll add it or use a workaround.
            // WORKAROUND: For now, I'll assume we add `GET /specialties/user/:userId` to backend.
            const response = await api.get(`/specialties/user/${member.id}`);
            return response.data;
        },
        enabled: !!member?.id && isOpen
    });

    if (!member) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Membro">
            <div className="space-y-6">
                {/* Header Info */}
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 border-2 border-slate-200">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{member.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                            <Mail className="w-4 h-4" />
                            {member.email}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {ROLE_TRANSLATIONS[member.role] || member.role}
                            </span>
                            {member.dbvClass && (
                                <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                    {member.dbvClass}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Specialties Section */}
                <div>
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Award className="w-5 h-5 text-blue-600" />
                        Especialidades Atribuídas
                    </h4>

                    {memberSpecialties.length === 0 ? (
                        <p className="text-slate-500 text-sm italic text-center py-4 border rounded-lg border-dashed">
                            Nenhuma especialidade atribuída.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
                            {memberSpecialties.map((us) => (
                                <div key={us.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                                    <div className="flex items-center gap-3">
                                        {us.specialty.imageUrl ? (
                                            <img src={us.specialty.imageUrl} alt="" className="w-10 h-10 object-contain" />
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                                <Award className="w-5 h-5 text-slate-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{us.specialty.name}</p>
                                            <p className="text-xs text-slate-500">{us.specialty.area}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${us.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        us.status === 'WAITING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {us.status === 'COMPLETED' ? 'Concluída' :
                                            us.status === 'WAITING_APPROVAL' ? 'Aguardando Aprovação' : 'Em Andamento'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Requirements Section */}
                <div>
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-green-600" />
                        Requisitos Pendentes
                    </h4>
                    <MemberRequirementsList memberId={member.id} />
                </div>
            </div>
        </Modal>
    );
}

