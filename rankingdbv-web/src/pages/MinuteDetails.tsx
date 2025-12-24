import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Calendar, User, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function MinuteDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [minute, setMinute] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);

    useEffect(() => {
        api.get(`/secretary/minutes/${id}`)
            .then(res => setMinute(res.data))
            .catch(err => {
                console.error(err);
                toast.error('Erro ao carregar ata.');
                navigate('/');
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    const handleSign = async () => {
        if (!confirm('Ao assinar, você confirma que leu e concorda com o conteúdo desta ata. Deseja prosseguir?')) return;

        setSigning(true);
        try {
            await api.post(`/secretary/minutes/${id}/sign`);
            toast.success('Assinado com sucesso!');
            // Refresh
            const res = await api.get(`/secretary/minutes/${id}`);
            setMinute(res.data);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Erro ao assinar.');
        } finally {
            setSigning(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Carregando...</div>;
    if (!minute) return <div className="p-8 text-center">Ata não encontrada.</div>;

    // Check if current user is an attendee
    const myAttendance = minute.attendees?.find((a: any) => a.user.id === user?.id);
    const isPending = myAttendance?.status === 'PENDING';
    const isSigned = myAttendance?.status === 'SIGNED';

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700">
                <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase border border-blue-200">
                                {minute.type}
                            </span>
                            <span className="flex items-center gap-1 text-slate-500 text-sm">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(minute.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">{minute.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
                            <User className="w-4 h-4" />
                            Registrado por: <span className="font-medium text-slate-700">{minute.author.name}</span>
                        </div>
                    </div>

                    {/* Status Badge for User */}
                    {myAttendance && (
                        <div className={`
                            px-4 py-3 rounded-lg border flex items-center gap-3 self-start
                            ${isSigned ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'}
                        `}>
                            {isSigned ? <CheckCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                            <div>
                                <div className="text-xs font-bold uppercase opacity-75">Seu Status</div>
                                <div className="font-bold">{isSigned ? 'ASSINADO' : 'PENDENTE DE ASSINATURA'}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-8 font-serif leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {minute.content}
                </div>

                {/* Actions */}
                {isPending && (
                    <div className="p-6 bg-orange-50 border-t border-orange-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-orange-800 text-sm">
                            <span className="font-bold">Ação Necessária:</span> Como participante desta reunião, sua assinatura digital é requerida.
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 hover:text-red-600 transition-colors">
                                <XCircle className="w-4 h-4" />
                                Reportar Erro / Recusar
                            </button>
                            <button
                                onClick={handleSign}
                                disabled={signing}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                            >
                                {signing ? 'Assinando...' : 'Li e Concordo (Assinar)'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Signatures List */}
                <div className="bg-slate-50 p-6 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Assinaturas Registradas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {minute.attendees?.map((att: any) => (
                            <div key={att.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                <div className={`w-2 h-2 rounded-full ${att.status === 'SIGNED' ? 'bg-green-500' : 'bg-slate-300'}`} />
                                <div>
                                    <div className="font-medium text-sm text-slate-700">{att.user.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {att.status === 'SIGNED'
                                            ? `Assinado em ${format(new Date(att.signedAt), "dd/MM HH:mm")}`
                                            : 'Pendente'
                                        }
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
