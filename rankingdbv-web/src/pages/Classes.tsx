import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { CheckCircle, AlertCircle, BookOpen, ChevronRight, Check } from 'lucide-react';
import { Modal } from '../components/Modal';

const CLASSES = ['AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];

export function Classes() {
    const queryClient = useQueryClient();
    const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const { data: students = [], isError } = useQuery({
        queryKey: ['classes-students', selectedClass],
        queryFn: async () => {
            const response = await api.get(`/classes/${selectedClass}/students`);
            return response.data || [];
        }
    });

    const approveMutation = useMutation({
        mutationFn: async (reqId: string) => {
            return api.patch(`/requirements/${reqId}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes-students'] });
            // Close modal if open or just refresh data
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gestão de Classes</h1>
                    <p className="text-slate-500">Acompanhe o progresso e assine requisitos</p>
                </div>
            </div>

            {/* Class Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {CLASSES.map(cls => (
                    <button
                        key={cls}
                        onClick={() => setSelectedClass(cls)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors
                            ${selectedClass === cls ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        {cls}
                    </button>
                ))}
            </div>

            {/* Students Grid */}
            {isError ? (
                <div className="bg-red-50 text-red-600 p-8 rounded-xl text-center border border-red-200">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-bold">Não foi possível carregar os desbravadores.</p>
                    <p className="text-sm opacity-75">Tente recarregar a página.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.isArray(students) && students.map((student: any) => (
                        <div key={student.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer group"
                            onClick={() => setSelectedStudent(student)}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                    {student.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{student.name}</h3>
                                    <p className="text-xs text-slate-500">{student.unit?.name || 'Sem Unidade'}</p>
                                </div>
                                <ChevronRight className="ml-auto w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                            </div>

                            {/* Progress Mock */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-600">Progresso</span>
                                    <span className="text-blue-600">{student.requirements?.filter((r: any) => r.status === 'APPROVED').length || 0} Aprovados</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-1/3"></div> {/* Mock width handled by backend later */}
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                                <span className="text-orange-600 font-bold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {student.requirements?.filter((r: any) => r.status === 'PENDING').length || 0} Pendentes
                                </span>
                            </div>
                        </div>
                    ))}
                    {students.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            Nenhum desbravador encontrado na classe {selectedClass}.
                        </div>
                    )}
                </div>
            )}

            {/* Quick Approval Modal */}
            <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title={`Requisitos: ${selectedStudent?.name}`}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Mostrando requisitos pendentes da classe {selectedClass}.
                    </div>

                    {selectedStudent?.requirements?.filter((r: any) => r.status === 'PENDING').map((req: any) => (
                        <div key={req.id} className="p-3 border rounded-lg bg-white flex justify-between items-start gap-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                                        {req.requirement?.code || 'REQ'}
                                    </span>
                                    <h4 className="font-medium text-slate-800 text-sm">{req.requirement?.description}</h4>
                                </div>
                                {req.answerText && (
                                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mt-1 italic">
                                        "{req.answerText}"
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => approveMutation.mutate(req.id)}
                                disabled={approveMutation.isPending}
                                className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 transition-colors"
                                title="Aprovar"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {(!selectedStudent?.requirements || selectedStudent.requirements.filter((r: any) => r.status === 'PENDING').length === 0) && (
                        <div className="text-center py-8 text-slate-500">
                            <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                            <p>Tudo em dia! Nenhum requisito pendente.</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
