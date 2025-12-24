import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Circle, Plus, BookOpen, Award, Search, Trash2, Pencil } from 'lucide-react';
import { Modal } from '../components/Modal';
import { RequirementAnswerModal } from '../components/RequirementAnswerModal';
import { Combobox } from '../components/Combobox';
import { useSearchParams } from 'react-router-dom';

// Types
interface Requirement {
    id: string;
    description: string;
    code?: string;
    dbvClass?: string;
    specialtyId?: string;
    area?: string;
    userProgress?: { status: string; answerText?: string; answerFileUrl?: string }[];
    type?: 'TEXT' | 'FILE' | 'BOTH' | 'QUESTIONNAIRE';
    questions?: Question[];
    clubId?: string;
}

interface Question {
    questionText: string;
    options: string[];
    correctIndex: number;
}

interface Specialty {
    id: string;
    name: string;
    area: string;
}

const DBV_CLASSES = [
    'AMIGO', 'COMPANHEIRO', 'PESQUISADOR',
    'PIONEIRO', 'EXCURSIONISTA', 'GUIA'
];

export function Requirements() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();

    const [activeTab, setActiveTab] = useState<'CLASSES' | 'SPECIALTIES' | 'MY_CLUB'>('CLASSES');
    const [selectedClass, setSelectedClass] = useState<string>(searchParams.get('class') || 'AMIGO');
    const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reqDescription, setReqDescription] = useState('');
    const [reqCode, setReqCode] = useState('');
    const [reqArea, setReqArea] = useState('');
    const [editingReqId, setEditingReqId] = useState<string | null>(null);
    const [reqType, setReqType] = useState<'TEXT' | 'FILE' | 'BOTH' | 'QUESTIONNAIRE' | 'NONE'>('NONE');
    const [questions, setQuestions] = useState<Question[]>([]);

    const addQuestion = () => {
        setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctIndex: 0 }]);
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    // Answer Modal State
    const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
    const [selectedAnswerReq, setSelectedAnswerReq] = useState<Requirement | null>(null);

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importUrl, setImportUrl] = useState('');
    const [importPreview, setImportPreview] = useState<any[]>([]);
    const [selectedImportIndices, setSelectedImportIndices] = useState<number[]>([]);

    // Search State
    const [search, setSearch] = useState('');

    // Fetch Specialties for dropdown
    const { data: specialties = [] } = useQuery<Specialty[]>({
        queryKey: ['specialties'],
        queryFn: async () => (await api.get('/specialties')).data
    });

    // Fetch Requirements
    const { data: requirements = [], isLoading } = useQuery<Requirement[]>({
        queryKey: ['requirements', activeTab, selectedClass, selectedSpecialtyId],
        queryFn: async () => {
            const params: any = {};
            if (activeTab === 'CLASSES') params.class = selectedClass;
            if (activeTab === 'SPECIALTIES') {
                if (!selectedSpecialtyId) return [];
                params.specialtyId = selectedSpecialtyId;
            }
            // For MY_CLUB, we fetch general/all (backend default) and filter in frontend
            const res = await api.get('/requirements', { params });
            return res.data;
        },
        enabled: activeTab === 'CLASSES' || !!selectedSpecialtyId || activeTab === 'MY_CLUB'
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/requirements', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requirements'] });
            closeModal();
            alert('Requisito criado com sucesso!');
        },
        onError: (err: any) => {
            console.error(err);
            const msg = err.response?.data?.message || 'Erro ao criar requisito.';
            alert(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: { id: string, payload: any }) => await api.patch(`/requirements/${data.id}`, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requirements'] });
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/requirements/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requirements'] });
        }
    });

    // Toggle Progress Mutation
    const toggleMutation = useMutation({
        mutationFn: async (requirementId: string) => {
            return api.post('/requirements/toggle', { requirementId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requirements'] });
        },
        onError: (err) => {
            console.error('Erro ao alternar status:', err);
            alert('Erro ao atualizar progresso.');
        }
    });

    // Import Mutation
    const importMutation = useMutation({
        mutationFn: async (items: any[]) => api.post('/requirements/import', items),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['requirements'] });
            alert(`Importado com sucesso: ${res.data.count} requisitos.`);
            setIsImportModalOpen(false);
            setImportUrl('');
            setImportPreview([]);
            setSelectedImportIndices([]);
        },
        onError: () => alert('Erro ao importar.')
    });

    const handleFetchImport = async () => {
        if (!importUrl) return;
        try {
            // Use Backend Scraper
            const res = await api.get('/requirements/scrape', { params: { url: importUrl } });
            const json = res.data;

            if (Array.isArray(json)) {
                setImportPreview(json);
                setSelectedImportIndices(json.map((_, i) => i)); // Select all by default
            } else {
                alert('O retorno não é uma lista de requisitos.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao buscar URL: Verifique se o link é válido.');
        }
    };

    const handleConfirmImport = () => {
        const items = selectedImportIndices.map(i => importPreview[i]);
        importMutation.mutate(items);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setReqDescription('');
        setReqCode('');
        setReqArea('');
        setReqType('NONE');
        setQuestions([]);
        setEditingReqId(null);
    };

    const openCreateModal = () => {
        setEditingReqId(null);
        setReqDescription('');
        setReqCode('');
        setReqArea('');
        setReqType('NONE');
        setQuestions([]);
        setIsModalOpen(true);
    };

    const openEditModal = (req: Requirement) => {
        setEditingReqId(req.id);
        setReqDescription(req.description);
        setReqCode(req.code || '');
        setReqArea(req.area || '');
        setReqType(req.type || 'NONE');
        setQuestions([]);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este requisito?')) {
            deleteMutation.mutate(id);
        }
    };

    const isAdmin = ['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(user?.role || '');

    const handleReqClick = (req: Requirement) => {
        if (isAdmin) return;

        const userProg = req.userProgress?.[0];

        if (!userProg) {
            alert('Este requisito precisa ser atribuído por seu conselheiro ou instrutor.');
            return;
        }

        const isApproved = req.userProgress?.some(up => up.status === 'APPROVED' || up.status === 'COMPLETED');

        if (isApproved) {
            alert('Este requisito já foi aprovado e não pode ser alterado.');
            return;
        }

        if (req.type && req.type !== 'NONE' as any) {
            setSelectedAnswerReq(req);
            setIsAnswerModalOpen(true);
        } else {
            toggleMutation.mutate(req.id);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            description: reqDescription,
            code: reqCode,
            area: reqArea,
            type: reqType === 'NONE' ? undefined : reqType,
            questions: reqType === 'QUESTIONNAIRE' ? questions : undefined
        };

        if (editingReqId) {
            updateMutation.mutate({ id: editingReqId, payload });
        } else {
            if (activeTab === 'CLASSES') payload.dbvClass = selectedClass;
            else if (activeTab === 'SPECIALTIES') payload.specialtyId = selectedSpecialtyId;
            // MY_CLUB: No class/specialty attached, backend uses user.clubId
            createMutation.mutate(payload);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Requisitos</h1>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('CLASSES')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium shrink-0 ${activeTab === 'CLASSES' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500'
                        }`}
                >
                    <BookOpen className="w-5 h-5" />
                    Classes
                </button>
                <button
                    onClick={() => setActiveTab('SPECIALTIES')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium shrink-0 ${activeTab === 'SPECIALTIES' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500'
                        }`}
                >
                    <Award className="w-5 h-5" />
                    Especialidades
                </button>
                <button
                    onClick={() => setActiveTab('MY_CLUB')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium shrink-0 ${activeTab === 'MY_CLUB' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500'
                        }`}
                >
                    <Award className="w-5 h-5" />
                    Meu Clube
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Pesquisar requisito..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow shadow-sm"
                />
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 items-center">
                {activeTab === 'CLASSES' ? (
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    >
                        {DBV_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                ) : activeTab === 'SPECIALTIES' ? (
                    <Combobox
                        options={specialties.map(s => ({ value: s.id, label: s.name }))}
                        value={selectedSpecialtyId}
                        onChange={setSelectedSpecialtyId}
                        placeholder="Selecione uma especialidade..."
                        className="min-w-[300px]"
                    />
                ) : (
                    <span className="text-slate-500 font-medium">Requisitos Personalizados do Clube</span>
                )}

                {/* Progress Bar */}
                {requirements.length > 0 && (
                    <div className="flex-1 px-4">
                        {(() => {
                            const total = requirements.length;
                            const completed = requirements.filter(req =>
                                req.userProgress?.some(up => up.status === 'APPROVED' || up.status === 'COMPLETED')
                            ).length;
                            const progress = Math.round((completed / total) * 100);

                            return (
                                <div className="w-full max-w-md ml-4">
                                    <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                                        <span>Progresso</span>
                                        <span>{progress}% ({completed}/{total})</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                        <div
                                            className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {isAdmin && (
                    <div className="ml-auto flex gap-2">
                        {user?.email === 'master@rankingdbv.com' && (
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                            >
                                <BookOpen className="w-5 h-5" /> Importar URL
                            </button>
                        )}
                        <button
                            onClick={openCreateModal}
                            disabled={activeTab === 'SPECIALTIES' && !selectedSpecialtyId}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            <Plus className="w-5 h-5" />
                            Adicionar Requisito
                        </button>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-6">
                {isLoading ? (
                    <p>Carregando...</p>
                ) : requirements.length === 0 ? (
                    <p className="text-slate-500 p-4 text-center">Nenhum requisito cadastrado.</p>
                ) : (
                    Object.entries(
                        requirements
                            .filter(req => {
                                if (activeTab === 'MY_CLUB') {
                                    if (!req.clubId) return false;
                                }

                                if (!search) return true;
                                const lower = search.toLowerCase();
                                return (
                                    req.description.toLowerCase().includes(lower) ||
                                    (req.code && req.code.toLowerCase().includes(lower))
                                );
                            })
                            .reduce((acc, req) => {
                                const area = req.area || 'Geral';
                                if (!acc[area]) acc[area] = [];
                                acc[area].push(req);
                                return acc;
                            }, {} as Record<string, Requirement[]>)
                    ).map(([area, reqs]) => (
                        <div key={area} className="space-y-2">
                            <h3 className="font-bold text-slate-700 text-lg border-b border-slate-200 pb-1 mb-3 mt-6 first:mt-0">
                                {area}
                            </h3>
                            <div className="space-y-2">
                                {reqs.map(req => {
                                    // isCompleted ONLY if status is APPROVED (Green)
                                    const isCompleted = req.userProgress?.some(up => up.status === 'APPROVED' || up.status === 'COMPLETED');

                                    const userProg = req.userProgress?.find(up => up.status === 'PENDING');
                                    const isPending = !!userProg;
                                    const hasAnswer = userProg?.answerText || userProg?.answerFileUrl;

                                    return (
                                        <div key={req.id}
                                            onClick={() => handleReqClick(req)}
                                            className={`p-4 rounded-lg border flex items-start gap-4 group cursor-pointer transition-colors ${isCompleted ? 'bg-green-50 border-green-200' :
                                                isPending ? (hasAnswer ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200') :
                                                    'bg-white border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="mt-1">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                                                    isPending ? (hasAnswer ? 'bg-yellow-100 border-yellow-400 text-yellow-600' : 'bg-blue-100 border-blue-400 text-blue-600') :
                                                        'border-slate-300'
                                                    }`}>
                                                    {isCompleted && <Circle className="w-3 h-3 fill-current" />}
                                                    {isPending && <Circle className={`w-3 h-3 ${hasAnswer ? 'text-yellow-600' : 'text-blue-600'}`} />}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                {req.code && <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded mr-2">{req.code}</span>}
                                                <span className={`text-slate-800 ${isCompleted ? 'text-slate-500 line-through' : ''}`}>
                                                    {req.description}
                                                </span>
                                                {isPending && (
                                                    <p className={`text-xs mt-1 font-semibold ${hasAnswer ? 'text-yellow-600' : 'text-blue-600'}`}>
                                                        {hasAnswer ? 'Aguardando Aprovação' : 'A Fazer (Atribuído)'}
                                                    </p>
                                                )}

                                            </div>
                                            {isAdmin && (
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditModal(req); }}
                                                        className="p-1 text-slate-400 hover:text-blue-600"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(req.id); }}
                                                        className="p-1 text-slate-400 hover:text-red-600"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingReqId ? "Editar Requisito" : "Novo Requisito"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Código (Opcional)</label>
                        <input
                            type="text"
                            value={reqCode}
                            onChange={e => setReqCode(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            placeholder="Ex: I.1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Área (Opcional)</label>
                        <input
                            list="req-areas-list"
                            type="text"
                            value={reqArea}
                            onChange={e => setReqArea(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            placeholder="Ex: Geral, Descoberta Espiritual"
                        />
                        <datalist id="req-areas-list">
                            <option value="I. GERAIS" />
                            <option value="II. DESCOBERTA ESPIRITUAL" />
                            <option value="III. SERVINDO A OUTROS" />
                            <option value="IV. DESENVOLVENDO AMIZADE" />
                            <option value="V. SAÚDE E APTIDÃO FÍSICA" />
                            <option value="VI. ORGANIZAÇÃO E LIDERANÇA" />
                            <option value="VII. ESTUDO DA NATUREZA" />
                            <option value="VIII. ARTE DE ACAMPAR" />
                            <option value="IX. ESTILO DE VIDA" />
                            <option value="X. CLASSE AVANÇADA" />
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Resposta</label>
                        <select
                            value={reqType}
                            onChange={e => setReqType(e.target.value as any)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        >
                            <option value="NONE">Apenas Checkbox (Padrão)</option>
                            <option value="TEXT">Texto</option>
                            <option value="FILE">Arquivo/Foto</option>

                            <option value="BOTH">Texto ou Arquivo</option>
                            <option value="QUESTIONNAIRE">Questionário</option>
                        </select>
                    </div>

                    {reqType === 'QUESTIONNAIRE' && (
                        <div className="space-y-4 border-l-2 border-green-500 pl-4 py-2">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700">Perguntas ({questions.length})</h3>
                                <button type="button" onClick={addQuestion} className="text-sm text-green-600 hover:underline flex items-center gap-1">
                                    <Plus className="w-4 h-4" /> Adicionar Pergunta
                                </button>
                            </div>
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                                    <div className="flex justify-between gap-2">
                                        <input
                                            type="text"
                                            placeholder={`Pergunta ${qIndex + 1}`}
                                            value={q.questionText}
                                            onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)}
                                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm"
                                            required
                                        />
                                        <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name={`correct-${qIndex}`}
                                                    checked={q.correctIndex === oIndex}
                                                    onChange={() => updateQuestion(qIndex, 'correctIndex', oIndex)}
                                                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder={`Opção ${oIndex + 1}`}
                                                    value={opt}
                                                    onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                                                    className={`w-full px-2 py-1 border rounded text-xs ${q.correctIndex === oIndex ? 'border-green-500 bg-green-50' : 'border-slate-300'}`}
                                                    required
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {questions.length === 0 && <p className="text-xs text-slate-500 italic">Nenhuma pergunta adicionada.</p>}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea
                            required
                            value={reqDescription}
                            onChange={e => setReqDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            rows={3}
                            placeholder="Descreva o requisito..."
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Answer Modal */}
            <RequirementAnswerModal
                isOpen={isAnswerModalOpen}
                onClose={() => setIsAnswerModalOpen(false)}
                requirement={selectedAnswerReq}
            />

            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Requisitos (JSON)"
            >
                <div className="space-y-4 max-h-[70vh] flex flex-col">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={importUrl}
                            onChange={e => setImportUrl(e.target.value)}
                            placeholder="https://exemplo.com/requisitos.json"
                            className="flex-1 p-2 border rounded"
                        />
                        <button onClick={handleFetchImport} className="bg-blue-600 text-white px-4 py-2 rounded">
                            Buscar
                        </button>
                    </div>

                    {importPreview.length > 0 && (
                        <div className="flex-1 overflow-auto border rounded p-2 bg-slate-50 space-y-2">
                            <p className="text-sm font-bold text-slate-700 mb-2">
                                {selectedImportIndices.length} selecionados de {importPreview.length}
                            </p>
                            {importPreview.map((item, i) => (
                                <div key={i} className="flex gap-2 items-start p-2 border-b last:border-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedImportIndices.includes(i)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedImportIndices([...selectedImportIndices, i]);
                                            else setSelectedImportIndices(selectedImportIndices.filter(idx => idx !== i));
                                        }}
                                        className="mt-1"
                                    />
                                    <div className="text-sm">
                                        <p className="font-bold">{item.code} - {item.area}</p>
                                        <p className="text-slate-600 line-clamp-2">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {importPreview.length > 0 && (
                        <div className="flex justify-end pt-2 border-t">
                            <button
                                onClick={handleConfirmImport}
                                className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700"
                            >
                                Confirmar Importação
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
