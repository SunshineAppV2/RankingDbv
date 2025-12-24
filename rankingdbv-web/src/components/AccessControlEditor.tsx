import { useState, useEffect } from 'react';
import { Check, Loader2, Save } from 'lucide-react';

interface AccessControlEditorProps {
    clubData: any;
    onSave: (permissions: any) => void;
    isPending: boolean;
}

const ROLES = [
    { key: 'SECRETARY', label: 'Secretária' },
    { key: 'TREASURER', label: 'Tesoureiro(a)' },
    { key: 'COUNSELOR', label: 'Conselheiro(a)' },
    { key: 'INSTRUCTOR', label: 'Instrutor(a)' },
    // { key: 'PARENT', label: 'Pais' }, // Parents have very specific limited view, not generic module access usually.
];

const MODULES = [
    { key: 'MEMBERS', label: 'Membros / Unidade' },
    { key: 'TREASURY', label: 'Tesouraria' },
    { key: 'SECRETARY', label: 'Secretaria (Fichas)' },
    { key: 'EVENTS', label: 'Eventos' },
    { key: 'CLASSES', label: 'Classes' },
    { key: 'ATTENDANCE', label: 'Chamada' },
    { key: 'APPROVALS', label: 'Aprovações' },
    // { key: 'STORE', label: 'Loja' }, // Loja is usually public or widespread?
];

export function AccessControlEditor({ clubData, onSave, isPending }: AccessControlEditorProps) {
    // Default Permissions (Fallback)
    const defaultPermissions = {
        SECRETARY: ['SECRETARY', 'MEMBERS', 'ATTENDANCE'],
        TREASURER: ['TREASURY'],
        COUNSELOR: ['MEMBERS', 'ATTENDANCE', 'EVENTS'],
        INSTRUCTOR: ['CLASSES', 'MEMBERS'],
    };

    const [permissions, setPermissions] = useState<any>(defaultPermissions);

    useEffect(() => {
        if (clubData?.settings?.permissions) {
            setPermissions(clubData.settings.permissions);
        }
    }, [clubData]);

    const togglePermission = (role: string, moduleKey: string) => {
        setPermissions((prev: any) => {
            const rolePerms = prev[role] || [];
            if (rolePerms.includes(moduleKey)) {
                return { ...prev, [role]: rolePerms.filter((p: string) => p !== moduleKey) };
            } else {
                return { ...prev, [role]: [...rolePerms, moduleKey] };
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 font-bold">Módulo / Menu</th>
                            {ROLES.map(role => (
                                <th key={role.key} className="px-4 py-3 text-center">{role.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {MODULES.map(module => (
                            <tr key={module.key} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-medium text-slate-700">{module.label}</td>
                                {ROLES.map(role => {
                                    const hasAccess = permissions[role.key]?.includes(module.key);
                                    return (
                                        <td key={`${role.key}-${module.key}`} className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => togglePermission(role.key, module.key)}
                                                className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${hasAccess
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'bg-white border-slate-300 text-transparent hover:border-blue-400'
                                                    }`}
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => onSave(permissions)}
                    disabled={isPending}
                    className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Permissões
                </button>
            </div>
        </div>
    );
}
