import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { toast } from 'sonner';
import { Send, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export function SystemMessages() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'>('INFO');
    const [sending, setSending] = useState(false);

    const mutation = useMutation({
        mutationFn: async (data: { title: string, message: string, type: string }) => {
            return api.post('/notifications/global', data);
        },
        onSuccess: (data: any) => {
            toast.success(`Mensagem enviada para ${data.data.count} usuários!`);
            setTitle('');
            setMessage('');
            setType('INFO');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erro ao enviar mensagem.');
        },
        onSettled: () => setSending(false)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            toast.warning('Preencha título e mensagem.');
            return;
        }
        if (!confirm('Tem certeza que deseja enviar esta mensagem para TODOS os usuários ativos?')) return;

        setSending(true);
        mutation.mutate({ title, message, type });
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Send className="w-6 h-6 text-purple-600" />
                Mensagens do Sistema (Global)
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            placeholder="Ex: Atualização do Sistema"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none h-32"
                            placeholder="Digite sua mensagem..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Alerta</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { val: 'INFO', label: 'Info', icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                                { val: 'SUCCESS', label: 'Sucesso', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                                { val: 'WARNING', label: 'Aviso', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                                { val: 'ERROR', label: 'Erro', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                            ].map((opt) => (
                                <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() => setType(opt.val as any)}
                                    className={`
                                        flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                                        ${type === opt.val ? `ring-2 ring-offset-1 ring-purple-500 ${opt.bg} ${opt.border}` : 'bg-white border-slate-200 hover:bg-slate-50'}
                                    `}
                                >
                                    <opt.icon className={`w-6 h-6 mb-2 ${opt.color}`} />
                                    <span className={`text-xs font-bold ${type === opt.val ? 'text-slate-800' : 'text-slate-500'}`}>
                                        {opt.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={sending}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-lg shadow-purple-200"
                    >
                        {sending ? 'Enviando...' : (
                            <>
                                <Send className="w-5 h-5" /> Enviar para Todos
                            </>
                        )}
                    </button>
                </form>
            </div>

            <div className="mt-8 bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-800 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>
                    <strong>Atenção:</strong> Esta ação enviará uma notificação instantânea para TODOS os usuários ativos do sistema. Use com cautela.
                </p>
            </div>
        </div>
    );
}
