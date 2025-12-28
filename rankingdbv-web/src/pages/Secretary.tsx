import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, FileText, Activity, Shield, CheckCircle, AlertCircle, Edit, Users, BookOpen } from 'lucide-react';
import { SecretaryMemberModal } from '../components/SecretaryMemberModal';
import { SecretaryMinutesList } from '../components/SecretaryMinutesList';
import { SecretaryMinuteEditor } from '../components/SecretaryMinuteEditor';

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Secretary() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'members' | 'minutes'>('members');
    const [search, setSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [isMinuteEditorOpen, setIsMinuteEditorOpen] = useState(false);
    const [editingMinute, setEditingMinute] = useState<any>(null);



    const { data: members = [], refetch } = useQuery({
        queryKey: ['secretary-members', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const q = query(collection(db, 'users'), where('clubId', '==', user.clubId));
            const snaps = await getDocs(q);
            return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        enabled: !!user?.clubId
    });

    const filteredMembers = members.filter((m: any) =>
        m.name.toLowerCase().includes(search.toLowerCase())
    );

    // Helpers to check status
    const getHealthStatus = (m: any) => {
        // Simple check: minimal fields filled
        if (m.bloodType && m.susNumber && m.emergencyName) return 'OK';
        return 'MISSING';
    };

    const getDataStatus = (m: any) => {
        if (m.cpf && m.birthDate && m.address) return 'OK';
        return 'MISSING';
    };

    const handleNewMinute = () => {
        setEditingMinute(null);
        setIsMinuteEditorOpen(true);
    };

    const handleEditMinute = (minute: any) => {
        setEditingMinute(minute);
        setIsMinuteEditorOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Secretaria</h1>
                    <p className="text-slate-500">Gerenciamento de cadastros, fichas médicas e registro de atas</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white rounded-xl p-1 w-fit shadow-sm border border-slate-200">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'members'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Membros e Fichas
                </button>
                <button
                    onClick={() => setActiveTab('minutes')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'minutes'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Atas e Atos
                </button>
            </div>

            {activeTab === 'members' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Fichas Médicas (Ok)</p>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {members.filter((m: any) => getHealthStatus(m) === 'OK').length} / {members.length}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Cadastros Completos</p>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {members.filter((m: any) => getDataStatus(m) === 'OK').length} / {members.length}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Seguro Anual</p>
                                <h3 className="text-xl font-bold text-slate-800">
                                    - / -
                                </h3>
                                <span className="text-xs text-slate-400">Em breve (Integração Financeira)</span>
                            </div>
                        </div>
                    </div>

                    {/* Search & List */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar desbravador..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-3">Nome</th>
                                        <th className="px-6 py-3 text-center">Ficha Médica</th>
                                        <th className="px-6 py-3 text-center">Dados</th>
                                        <th className="px-6 py-3 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredMembers.map((member: any) => (
                                        <tr key={member.id} className="hover:bg-slate-50 group">
                                            <td className="px-6 py-3 font-medium text-slate-800 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                                    {member.photoUrl ? (
                                                        <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                                                            {member.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold">{member.name}</div>
                                                    <div className="text-xs text-slate-500">{member.role}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {getHealthStatus(member) === 'OK' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                                        <CheckCircle className="w-3 h-3" /> Completo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                                                        <AlertCircle className="w-3 h-3" /> Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {getDataStatus(member) === 'OK' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                                        <CheckCircle className="w-3 h-3" /> Ok
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                                                        <AlertCircle className="w-3 h-3" /> Parcial
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button
                                                    onClick={() => setSelectedMember(member)}
                                                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-2 mx-auto"
                                                >
                                                    <Edit className="w-3 h-3" /> Editar / Ficha
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'minutes' && (
                <SecretaryMinutesList
                    onNew={handleNewMinute}
                    onEdit={handleEditMinute}
                />
            )}

            {selectedMember && (
                <SecretaryMemberModal
                    isOpen={!!selectedMember}
                    onClose={() => { setSelectedMember(null); refetch(); }}
                    memberId={selectedMember.id}
                    initialData={selectedMember}
                />
            )}

            {isMinuteEditorOpen && (
                <SecretaryMinuteEditor
                    initialData={editingMinute}
                    onClose={() => setIsMinuteEditorOpen(false)}
                    onSave={() => {
                        // Invalidate query to refresh list
                        // Ideally we would invalidate 'secretary-minutes' query here
                    }}
                />
            )}
        </div>
    );
}
