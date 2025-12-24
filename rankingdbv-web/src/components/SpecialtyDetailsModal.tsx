import { useState } from 'react';
import { X, CheckCircle, Circle, Upload, FileText, Send, Download } from 'lucide-react';
import { api } from '../lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';

interface Requirement {
    id: string;
    description: string;
    type: 'TEXT' | 'FILE';
}

interface Specialty {
    id: string;
    name: string;
    imageUrl?: string;
    requirements: Requirement[];
    area?: string; // Add if available
}

interface UserRequirement {
    requirementId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    answerText?: string;
    answerFileUrl?: string;
}

interface UserSpecialty {
    id: string;
    specialtyId: string;
    status: 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'COMPLETED';
    awardedAt?: string;
}

interface SpecialtyDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    specialty: Specialty | null;
    userSpecialty?: UserSpecialty; // Status of the specialty itself
}

export function SpecialtyDetailsModal({ isOpen, onClose, specialty, userSpecialty }: SpecialtyDetailsModalProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [files, setFiles] = useState<Record<string, File | null>>({});

    // Fetch user progress
    const { data: userProgress = [] } = useQuery<UserRequirement[]>({
        queryKey: ['user-requirements', specialty?.id],
        queryFn: async () => {
            if (!specialty?.id) return [];
            const res = await api.get(`/specialties/${specialty?.id}/progress`);
            return res.data;
        },
        enabled: !!specialty?.id && isOpen
    });

    const submitAnswerMutation = useMutation({
        mutationFn: async ({ reqId, text, file }: { reqId: string, text?: string, file?: File }) => {
            let fileUrl = '';
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await api.post('/uploads', formData);
                fileUrl = uploadRes.data.url;
            }

            await api.post('/specialties/answer', {
                requirementId: reqId,
                text,
                fileUrl
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-requirements'] });
            alert('Resposta enviada!');
        }
    });

    const handleSubmit = (reqId: string, type: 'TEXT' | 'FILE') => {
        if (type === 'TEXT') {
            submitAnswerMutation.mutate({ reqId, text: answers[reqId] });
        } else {
            submitAnswerMutation.mutate({ reqId, file: files[reqId] || undefined });
        }
    };

    const handleDownloadCertificate = () => {
        if (!specialty || !user) return;

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Simple Design
        // Border
        doc.setLineWidth(2);
        doc.rect(10, 10, 277, 190);
        doc.setLineWidth(0.5);
        doc.rect(15, 15, 267, 180);

        // Header
        doc.setFontSize(30);
        doc.setFont("helvetica", "bold");
        doc.text("Certificado de Honra", 148.5, 40, { align: 'center' });

        // Body
        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.text("Certificamos que", 148.5, 70, { align: 'center' });

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(user.name, 148.5, 85, { align: 'center' });

        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.text("concluiu com êxito os requisitos da especialidade de", 148.5, 100, { align: 'center' });

        doc.setFontSize(22);
        doc.setTextColor(0, 102, 204); // Blue
        doc.text(specialty.name, 148.5, 115, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Date
        const date = userSpecialty?.awardedAt
            ? new Date(userSpecialty.awardedAt).toLocaleDateString('pt-BR')
            : new Date().toLocaleDateString('pt-BR');

        doc.setFontSize(14);
        doc.text(`Data de Conclusão: ${date}`, 148.5, 140, { align: 'center' });

        // Signatures (Mock)
        doc.line(60, 170, 120, 170);
        doc.text("Diretor do Clube", 90, 175, { align: 'center' });

        doc.line(170, 170, 230, 170);
        doc.text("Instrutor", 200, 175, { align: 'center' });

        doc.save(`Certificado-${specialty.name}.pdf`);
    };

    if (!isOpen || !specialty) return null;

    const isCompleted = userSpecialty?.status === 'COMPLETED';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        {specialty.imageUrl ? (
                            <img src={specialty.imageUrl} alt="" className="w-12 h-12 object-contain" />
                        ) : (
                            <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-slate-400" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{specialty.name}</h2>
                            <p className="text-sm text-slate-500">{specialty.requirements.length} Requisitos</p>
                        </div>
                    </div>
                    {isCompleted && (
                        <button
                            onClick={handleDownloadCertificate}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm shadow-sm transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Baixar Certificado
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors ml-2">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Completion Message */}
                    {isCompleted && (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3">
                            <CheckCircle className="w-6 h-6" />
                            <div>
                                <p className="font-bold">Parabéns!</p>
                                <p className="text-sm">Você completou esta especialidade.</p>
                            </div>
                        </div>
                    )}

                    {specialty.requirements.map((req, index) => {
                        const progress = userProgress?.find((up: any) => up.requirementId === req.id);
                        const isReqCompleted = progress?.status === 'APPROVED' || progress?.status === 'PENDING';
                        const status = progress?.status || 'NOT_STARTED';

                        return (
                            <div key={req.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                                        status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' :
                                            'bg-slate-100 text-slate-400'
                                        }`}>
                                        {status === 'APPROVED' ? <CheckCircle className="w-4 h-4" /> :
                                            status === 'PENDING' ? <Circle className="w-4 h-4" /> :
                                                <span className="text-xs font-bold">{index + 1}</span>}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-slate-800 font-medium mb-3">{req.description}</p>

                                        {/* Answer Section */}
                                        {!isReqCompleted && !isCompleted && (
                                            <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                                                {req.type === 'TEXT' ? (
                                                    <textarea
                                                        value={answers[req.id] || ''}
                                                        onChange={e => setAnswers(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                        placeholder="Digite sua resposta..."
                                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <label className="flex-1 cursor-pointer bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2 hover:bg-slate-50 transition-colors">
                                                            <Upload className="w-4 h-4 text-slate-400" />
                                                            <span className="text-sm text-slate-600 truncate">
                                                                {files[req.id]?.name || 'Escolher arquivo...'}
                                                            </span>
                                                            <input type="file" className="hidden" onChange={e => setFiles(prev => ({ ...prev, [req.id]: e.target.files?.[0] || null }))} />
                                                        </label>
                                                    </div>
                                                )}

                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => handleSubmit(req.id, req.type)}
                                                        disabled={req.type === 'TEXT' ? !answers[req.id] : !files[req.id]}
                                                        className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all"
                                                    >
                                                        <Send className="w-3 h-3" />
                                                        Enviar Resposta
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Status Feedback */}
                                        {status === 'PENDING' && (
                                            <p className="text-xs text-yellow-600 font-medium mt-2 bg-yellow-50 inline-block px-2 py-1 rounded">
                                                Aguarda Aprovação
                                            </p>
                                        )}
                                        {status === 'APPROVED' && (
                                            <p className="text-xs text-green-600 font-medium mt-2 bg-green-50 inline-block px-2 py-1 rounded">
                                                Aprovado!
                                            </p>
                                        )}
                                        {status === 'REJECTED' && (
                                            <p className="text-xs text-red-600 font-medium mt-2 bg-red-50 inline-block px-2 py-1 rounded">
                                                Refazer (Verifique com seu instrutor)
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
