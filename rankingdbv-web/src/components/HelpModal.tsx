import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Modal } from './Modal';

interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: string;
    isVisible: boolean;
}

export function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = ['OWNER', 'ADMIN'].includes(user?.role || '');

    // Admin sees ALL, User sees only VISIBLE
    // We pass ?all=true if admin.
    const { data: faqs = [], isLoading } = useQuery<FAQ[]>({
        queryKey: ['faqs', isAdmin],
        queryFn: async () => {
            const params = isAdmin ? '?all=true' : '';
            const response = await api.get(`/faqs${params}`);
            return response.data;
        },
        enabled: isOpen
    });

    const toggleMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.patch(`/faqs/${id}/toggle`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faqs'] });
        }
    });

    // Group by category
    const groupedFaqs = faqs.reduce((groups: any, faq) => {
        const cat = faq.category || 'GERAL';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(faq);
        return groups;
    }, {});

    const [openItems, setOpenItems] = useState<string[]>([]);

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Central de Ajuda (FAQ)">
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {isLoading && <p className="text-center text-slate-500 py-4">Carregando perguntas...</p>}

                {!isLoading && faqs.length === 0 && (
                    <p className="text-center text-slate-500 py-4">Nenhuma pergunta encontrada.</p>
                )}

                {Object.keys(groupedFaqs).map(category => (
                    <div key={category}>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">
                            {category}
                        </h3>
                        <div className="space-y-2">
                            {groupedFaqs[category].map((faq: FAQ) => (
                                <div key={faq.id} className={`border rounded-lg transition-all ${openItems.includes(faq.id) ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-200'}`}>
                                    <button
                                        onClick={() => toggleItem(faq.id)}
                                        className="w-full flex items-center justify-between p-3 text-left"
                                    >
                                        <span className={`font-medium ${openItems.includes(faq.id) ? 'text-blue-700' : 'text-slate-700'} ${!faq.isVisible ? 'opacity-50' : ''}`}>
                                            {faq.isVisible ? '' : '[OCULTO] '} {faq.question}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleMutation.mutate(faq.id);
                                                    }}
                                                    className={`p-1 rounded hover:bg-slate-200 cursor-pointer ${faq.isVisible ? 'text-emerald-500' : 'text-slate-400'}`}
                                                    title="Alternar visibilidade para membros"
                                                >
                                                    {faq.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                </div>
                                            )}
                                            {openItems.includes(faq.id) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </div>
                                    </button>

                                    {openItems.includes(faq.id) && (
                                        <div className="px-3 pb-3 pt-0 text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
}
