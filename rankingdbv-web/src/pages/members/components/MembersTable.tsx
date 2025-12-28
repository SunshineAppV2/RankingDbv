
import { useState, useMemo } from 'react';
import { User, Mail, Eye, Edit, Trash2 } from 'lucide-react';
import { ROLE_TRANSLATIONS } from '../types';
import type { Member, Unit } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

interface MembersTableProps {
    members: Member[];
    units: Unit[];
    onInspect: (member: Member) => void;
    onEdit: (member: Member) => void;
    onDelete: (id: string) => void;
}

export function MembersTable({ members, units, onInspect, onEdit, onDelete }: MembersTableProps) {
    const { user } = useAuth();
    const [sortConfig, setSortConfig] = useState<{ key: keyof Member | 'age' | 'unitName' | 'clubName'; direction: 'asc' | 'desc' } | null>(null);

    const getAge = (dateString?: string | null) => {
        if (!dateString) return '-';
        const today = new Date();
        const birthDate = new Date(dateString);
        if (isNaN(birthDate.getTime())) return '-';
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return isNaN(age) ? '-' : age;
    };

    const handleSort = (key: keyof Member | 'age' | 'unitName' | 'clubName') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedMembers = useMemo(() => {
        if (!sortConfig) return members;
        if (!Array.isArray(members)) return [];

        return [...members].sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof Member];
            let bValue: any = b[sortConfig.key as keyof Member];

            if (sortConfig.key === 'age') {
                aValue = getAge(a.birthDate);
                bValue = getAge(b.birthDate);
                if (aValue === '-') aValue = -1;
                if (bValue === '-') bValue = -1;
            } else if (sortConfig.key === 'unitName') {
                aValue = units?.find(u => u.id === a.unitId)?.name || '';
                bValue = units?.find(u => u.id === b.unitId)?.name || '';
            } else if (sortConfig.key === 'clubName') {
                aValue = a.club?.name || '';
                bValue = b.club?.name || '';
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [members, sortConfig, units]);

    const renderSortIcon = (column: string) => {
        if (sortConfig?.key !== column) return <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">↕</span>;
        return sortConfig.direction === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
    };

    const renderTh = (label: string, sortKey: string, align: 'left' | 'right' | 'center' = 'left') => (
        <th
            className={`px-6 py-4 text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 group select-none text-${align}`}
            onClick={() => handleSort(sortKey as any)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                {label} {renderSortIcon(sortKey)}
            </div>
        </th>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            {renderTh("Nome", "name")}
                            {renderTh("Idade", "age")}
                            {renderTh("Contato", "email")}
                            {renderTh("Classe", "dbvClass")}
                            {user?.email === 'master@cantinhodbv.com' && renderTh("Clube", "clubName")}
                            {renderTh("Unidade", "unitName")}
                            {renderTh("Cargo", "role")}
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedMembers.map(member => (
                            <tr key={member.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User className="w-4 h-4" /></div>
                                        <span className="font-medium text-slate-900">{member.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{getAge(member.birthDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600"><Mail className="w-4 h-4 inline mr-1" />{member.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className={`text-xs px-2 py-1 rounded-full ${member.dbvClass ? 'bg-blue-50 text-blue-700' : 'text-slate-400'}`}>{member.dbvClass || 'Nenhuma'}</span></td>
                                {user?.email === 'master@cantinhodbv.com' && <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">{member.club?.name || '-'}</td>}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{units?.find(u => u.id === member.unitId)?.name || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs font-medium">{ROLE_TRANSLATIONS[member.role] || member.role}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onInspect(member)} className="text-slate-400 hover:text-blue-600" title="Ver Detalhes"><Eye className="w-4 h-4" /></button>
                                        {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                                            <>
                                                <button onClick={() => onEdit(member)} className="text-slate-400 hover:text-blue-600" title="Editar"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => { if (window.confirm('Tem certeza que deseja excluir este membro?')) onDelete(member.id); }} className="text-slate-400 hover:text-red-600" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {members.length === 0 && <div className="p-8 text-center text-slate-500">Nenhum membro encontrado.</div>}
        </div>
    );
}
