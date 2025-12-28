
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Edit, Trash2, Plus, Calendar, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Minute {
    id: string;
    title: string;
    type: string;
    date: string;
    content: string;
    author: {
        name: string;
    };
    attendees?: {
        user: { name: string; role: string; };
        status: string;
        signedAt: string;
    }[];
}

interface SecretaryMinutesListProps {
    onEdit: (minute: Minute) => void;
    onNew: () => void;
}

export function SecretaryMinutesList({ onEdit, onNew }: SecretaryMinutesListProps) {
    const { data: minutes = [], isLoading, refetch } = useQuery({
        queryKey: ['secretary-minutes'],
        queryFn: async () => {
            const res = await api.get('/secretary/minutes');
            return res.data;
        }
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta ata?')) return;
        try {
            await api.delete(`/secretary/minutes/${id}`);
            toast.success('Ata excluída com sucesso!');
            refetch();
        } catch (error) {
            toast.error('Erro ao excluir ata');
        }
    };

    const generatePDF = (minute: Minute) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(minute.title.toUpperCase(), 105, 20, { align: 'center' }); // Centered Title

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`TIPO: ${getLabel(minute.type).toUpperCase()}`, 105, 28, { align: 'center' });
        doc.text(`DATA: ${format(new Date(minute.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}`, 105, 33, { align: 'center' });

        // Content
        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(minute.content, 180);
        doc.text(splitText, 15, 50);

        // Signatures Table
        if (minute.attendees && minute.attendees.length > 0) {
            let finalY: any = (doc as any).lastAutoTable?.finalY || 50 + (splitText.length * 7) + 20;

            doc.text('ASSINATURAS DIGITAIS', 15, finalY);

            autoTable(doc, {
                startY: finalY + 5,
                head: [['Participante', 'Cargo', 'Status', 'Data Assinatura']],
                body: minute.attendees.map(att => [
                    att.user.name,
                    att.user.role || '-',
                    att.status === 'SIGNED' ? 'ASSINADO' : 'PENDENTE',
                    att.signedAt ? format(new Date(att.signedAt), "dd/MM/yyyy HH:mm") : '-'
                ]),
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] }
            });
        }

        // Footer Metadata
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Gerado pelo Sistema Cantinho DBV em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 105, 290, { align: 'center' });
        }

        doc.save(`ATA_${minute.date.split('T')[0]}.pdf`);
        toast.success('PDF gerado com sucesso!');
    };

    const getLabel = (type: string) => {
        const map: any = {
            'ATA_REGULAR': 'Ata Regular',
            'ATA_DIRETORIA': 'Ata Diretoria',
            'ATA_COMISSAO': 'Ata Comissão',
            'ATA_EXTRAORDINARIA': 'Ata Extra.',
            'ATO_NOMEACAO': 'Ato Nomeação',
            'ATO_DISCIPLINAR': 'Ato Disciplinar',
            'ATO_OUTROS': 'Ato Adm.',
            'REGULAR': 'Ata Regular', // Legacy
            'DIRETORIA': 'Ata Diretoria', // Legacy
            'COMISSAO': 'Ata Comissão', // Legacy
            'EXTRAORDINARIA': 'Ata Extra.', // Legacy
            'ATO': 'Ato Adm.' // Legacy
        };
        return map[type] || type;
    };

    const getColor = (type: string) => {
        if (type.startsWith('ATO')) return 'bg-orange-100 text-orange-700 border border-orange-200';
        if (type.includes('DIRETORIA') || type.includes('COMISSAO')) return 'bg-purple-100 text-purple-700 border border-purple-200';
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Carregando atas...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-500" />
                    Atas e Atos Registrados
                </h2>
                <button
                    onClick={onNew}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
                >
                    <Plus className="w-4 h-4" />
                    Nova Ata / Ato
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {minutes.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Nenhum registro encontrado.</p>
                        <p className="text-sm text-slate-400">Clique em "Nova Ata / Ato" para começar.</p>
                    </div>
                ) : (
                    minutes.map((minute: Minute) => (
                        <div key={minute.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getColor(minute.type)}`}>
                                            {getLabel(minute.type)}
                                        </span>
                                        <span className="text-sm text-slate-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(minute.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg">{minute.title}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2">
                                        {minute.content.replace(/<[^>]*>?/gm, '')}
                                    </p>
                                    <p className="text-xs text-slate-400 pt-2">
                                        Registrado por: <span className="font-medium text-slate-600">{minute.author.name}</span>
                                    </p>
                                </div>

                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => generatePDF(minute)}
                                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                        title="Baixar PDF"
                                    >
                                        <FileDown className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onEdit(minute)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg"
                                        title="Editar"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(minute.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
