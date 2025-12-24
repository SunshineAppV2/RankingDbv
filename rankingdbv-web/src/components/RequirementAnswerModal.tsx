import { useState, useEffect } from 'react';
import { X, Send, Upload, CheckCircle } from 'lucide-react';
import { api } from '../lib/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Requirement {
    id: string;
    description: string;
    type?: 'TEXT' | 'FILE' | 'BOTH' | 'QUESTIONNAIRE';
}

interface RequirementAnswerModalProps {
    isOpen: boolean;
    onClose: () => void;
    requirement: Requirement | null;
}



export function RequirementAnswerModal({ isOpen, onClose, requirement }: RequirementAnswerModalProps) {
    const queryClient = useQueryClient();
    const [answerText, setAnswerText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [quizResult, setQuizResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processedQuestions, setProcessedQuestions] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            setAnswerText('');
            setSelectedFile(null);
            setQuizAnswers({});
            setQuizResult(null);
            setProcessedQuestions([]);
        }
    }, [isOpen, requirement]);

    // Fetch Quiz Questions
    const { data: quizQuestions = [], isLoading: isLoadingQuiz } = useQuery({
        queryKey: ['quiz', requirement?.id],
        queryFn: async () => {
            if (!requirement || requirement.type !== 'QUESTIONNAIRE') return [];
            const res = await api.get(`/requirements/${requirement.id}/quiz`);
            return res.data;
        },
        enabled: !!requirement && requirement.type === 'QUESTIONNAIRE' && isOpen
    });

    useEffect(() => {
        if (quizQuestions && quizQuestions.length > 0) {
            const shuffled = quizQuestions.map((q: any) => {
                const optionsWithIndex = q.options.map((opt: string, idx: number) => ({
                    text: opt,
                    originalIndex: idx
                }));
                // Fisher-Yates shuffle
                for (let i = optionsWithIndex.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
                }
                return { ...q, shuffledOptions: optionsWithIndex };
            });
            setProcessedQuestions(shuffled);
        }
    }, [quizQuestions]);

    const submitAnswerMutation = useMutation({
        mutationFn: async () => {
            if (!requirement) return;

            let fileUrl = '';
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                const uploadRes = await api.post('/uploads', formData);
                fileUrl = uploadRes.data.url;
            }

            if (requirement.type === 'QUESTIONNAIRE') {
                const answersPayload = Object.entries(quizAnswers).map(([qId, idx]) => ({
                    questionId: qId,
                    selectedIndex: idx
                }));
                const res = await api.post(`/requirements/${requirement.id}/quiz/submit`, { answers: answersPayload });
                if (!res.data.success) {
                    throw new Error(res.data.message);
                }
                return res.data;
            } else {
                await api.post('/requirements/answer', {
                    requirementId: requirement.id,
                    text: answerText,
                    fileUrl
                });
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['requirements'] });
            if (requirement?.type === 'QUESTIONNAIRE') {
                setQuizResult({ success: true, message: data.message });
            } else {
                onClose();
                setAnswerText('');
                setSelectedFile(null);
                alert('Resposta enviada com sucesso! Aguarde aprovação.');
            }
        },
        onError: (err: any) => {
            if (requirement?.type === 'QUESTIONNAIRE') {
                setQuizResult({ success: false, message: err.message || 'Erro ao enviar respostas.' });
            } else {
                alert('Erro ao enviar resposta.');
            }
        },
        onSettled: () => setIsSubmitting(false)
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        submitAnswerMutation.mutate();
    };

    if (!isOpen || !requirement) return null;

    const showText = requirement.type === 'TEXT' || requirement.type === 'BOTH' || !requirement.type;
    const showFile = requirement.type === 'FILE' || requirement.type === 'BOTH';
    const showQuiz = requirement.type === 'QUESTIONNAIRE';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                    <h3 className="font-bold text-slate-800">
                        {showQuiz ? 'Responder Questionário' : 'Responder Requisito'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Requisito</span>
                        <p className="text-slate-800 font-medium">{requirement.description}</p>
                    </div>

                    {showText && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Sua Resposta (Texto)</label>
                            <textarea
                                value={answerText}
                                onChange={e => setAnswerText(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none h-32"
                                placeholder="Digite sua resposta aqui..."
                                required={!showFile} // Text is required if file is not shown (or both?) - Logic: at least one if both? Let's make text optional if file is present.
                            />
                        </div>
                    )}

                    {showFile && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Anexo (Foto/Documento)</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {selectedFile ? (
                                        <>
                                            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                                            <p className="text-sm text-slate-500 font-medium">{selectedFile.name}</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                            <p className="text-xs text-slate-500">Clique para enviar arquivo</p>
                                        </>
                                    )}
                                </div>
                                <input type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                    )}

                    {showQuiz && (
                        <div className="space-y-6">
                            {quizResult ? (
                                <div className={`p-4 rounded-lg text-center ${quizResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    <p className="font-bold text-lg mb-2">{quizResult.success ? 'Sucesso!' : 'Falhou'}</p>
                                    <p>{quizResult.message}</p>
                                    <button
                                        type="button"
                                        onClick={quizResult.success ? onClose : () => setQuizResult(null)}
                                        className="mt-4 px-4 py-2 bg-white rounded border border-current font-medium text-sm hover:opacity-80"
                                    >
                                        {quizResult.success ? 'Fechar' : 'Tentar Novamente'}
                                    </button>
                                </div>
                            ) : isLoadingQuiz ? (
                                <p className="text-center text-slate-500">Carregando perguntas...</p>
                            ) : (
                                <>
                                    {processedQuestions.map((q: any, i: number) => (
                                        <div key={q.id} className="space-y-3">
                                            <p className="font-medium text-slate-800">{i + 1}. {q.questionText}</p>
                                            <div className="space-y-2 pl-2">
                                                {q.shuffledOptions?.map((optObj: { text: string, originalIndex: number }, uiIdx: number) => (
                                                    <label key={uiIdx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors ${quizAnswers[q.id] === optObj.originalIndex ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}>
                                                        <input
                                                            type="radio"
                                                            name={q.id}
                                                            checked={quizAnswers[q.id] === optObj.originalIndex}
                                                            onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: optObj.originalIndex }))}
                                                            className="w-4 h-4 text-green-600 focus:ring-green-500 border-slate-300"
                                                        />
                                                        <span className="text-sm text-slate-700">{optObj.text}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {!quizResult && (
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || (!showQuiz && !answerText && !selectedFile) || (showQuiz && (!quizQuestions.length || Object.keys(quizAnswers).length < quizQuestions.length))}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-all"
                            >
                                {isSubmitting ? 'Enviando...' : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {showQuiz ? 'Enviar Respostas' : 'Enviar Resposta'}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
