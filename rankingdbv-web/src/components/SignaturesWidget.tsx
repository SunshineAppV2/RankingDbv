import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { FileSignature, ChevronRight, AlertCircle } from 'lucide-react';

export function SignaturesWidget() {
    const navigate = useNavigate();

    const { data: pending = [], isLoading } = useQuery({
        queryKey: ['pending-signatures'],
        queryFn: async () => {
            const res = await api.get('/secretary/minutes/pending/my');
            return res.data;
        }
    });

    if (isLoading || pending.length === 0) return null;

    return (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                        <FileSignature className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Assinaturas Pendentes</h3>
                        <p className="text-sm text-slate-500">
                            Você tem <span className="font-bold text-orange-600">{pending.length}</span> documento(s) aguardando assinatura.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {pending.slice(0, 3).map((item: any) => (
                    <div
                        key={item.id}
                        onClick={() => navigate(`/dashboard/minutes/review/${item.minute.id}`)}
                        className="bg-white p-3 rounded-lg border border-orange-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-all hover:bg-orange-50/50"
                    >
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <div>
                                <div className="font-bold text-sm text-slate-800">{item.minute.title}</div>
                                <div className="text-xs text-slate-500">
                                    Registrado por {item.minute.author?.name}
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                ))}

                {pending.length > 3 && (
                    <button className="text-xs text-orange-600 font-bold hover:underline w-full text-center pt-2">
                        Ver mais {pending.length - 3} documentos
                    </button>
                )}
            </div>
        </div>
    );
}
