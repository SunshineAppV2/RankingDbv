import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    UserCircle,
    Users,
    Calendar,
    Award,
    DollarSign,
    ShoppingBag,
    Settings,
    Shield,
    FileText,
    LogOut,
    ListChecks,
    Building2,
    AlertTriangle,
    Globe,
    BarChart,
    BookOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/axios';
import { useQuery } from '@tanstack/react-query';

// --- Types ---
type MenuItem = {
    id: string;
    label: string;
    icon: React.ElementType;
    path?: string;
    subItems?: MenuItem[];
    badge?: number; // For alerts/counts
};

// --- Styles ---
const COLORS = {
    primary: '#7CB342', // Main Green
    primaryDark: '#558B2F', // Darker Green (Hover/Active)
    text: '#FFFFFF',
    textMuted: 'rgba(255, 255, 255, 0.7)',
};

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (o: boolean) => void }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Close secondary menu when clicking outside (handled by layout overlay usually, but simple state here)
    // Auto-select menu based on current path
    useEffect(() => {
        // Simple heuristic to highlight the correct top-level item
        const path = location.pathname;
        if (path === '/dashboard') setActiveMenu('dashboard');
        else if (path.includes('/profile') || path.includes('/family') || path.includes('/requirements') || path.includes('/activities')) setActiveMenu('access');
        else if (path.includes('/members') || path.includes('/classes') || path.includes('/events') || path.includes('/meetings') || path.includes('/secretary') || path.includes('/approvals')) setActiveMenu('management');
        else if (path.includes('/financial') || path.includes('/treasury') || path.includes('/master-treasury')) setActiveMenu('financial');
        else if (path.includes('/reports') || path.includes('/ranking') || path.includes('/signatures')) setActiveMenu('reports');
        else if (path.includes('/store')) setActiveMenu('store');
        else if (path.includes('/settings') || path.includes('/admin') || path.includes('/hierarchy')) setActiveMenu('config');
    }, [location.pathname]);

    // Permissions Query (reused logic)
    const { data: clubData } = useQuery({
        queryKey: ['club-settings-sidebar', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return null;
            const res = await api.get(`/clubs/${user.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId,
        staleTime: 1000 * 60 * 5
    });

    const hasAccess = (moduleKey: string) => {
        if (!user) return false;
        if (['OWNER', 'ADMIN', 'MASTER'].includes(user.role)) return true;
        const perms = clubData?.settings?.permissions || {
            SECRETARY: ['SECRETARY', 'MEMBERS', 'ATTENDANCE', 'EVENTS'],
            TREASURER: ['TREASURY'],
            COUNSELOR: ['MEMBERS', 'ATTENDANCE', 'EVENTS'],
            INSTRUCTOR: ['CLASSES', 'MEMBERS', 'EVENTS'],
        };
        return perms[user.role]?.includes(moduleKey);
    };

    // --- Menu Construction ---
    const getMenuItems = (): MenuItem[] => {
        const items: MenuItem[] = [];

        // 1. INÍCIO
        items.push({
            id: 'dashboard',
            label: 'INÍCIO',
            icon: LayoutDashboard,
            path: '/dashboard'
        });

        // 2. MEU ACESSO (Personal)
        const accessSubItems: MenuItem[] = [
            { id: 'profile', label: 'Meu Perfil', icon: UserCircle, path: '/dashboard/profile' },
            { id: 'requirements', label: 'Meus Requisitos', icon: ListChecks, path: '/dashboard/requirements' },
            { id: 'my-activities', label: 'Minhas Atividades', icon: Award, path: '/dashboard/activities' },
        ];
        if (['PARENT', 'OWNER', 'ADMIN', 'MASTER'].includes(user?.role || '')) {
            accessSubItems.push({ id: 'family', label: 'Minha Família', icon: Users, path: '/dashboard/family' });
        }
        if (user?.role === 'PARENT') {
            items.push({
                id: 'alerts',
                label: 'ALERTAS',
                icon: AlertTriangle,
                path: '/dashboard/alerts'
            })
        }

        items.push({
            id: 'access',
            label: 'MEU ACESSO',
            icon: UserCircle,
            subItems: accessSubItems
        });


        // 3. GESTÃO (Management)
        const managementSubItems: MenuItem[] = [];
        if (hasAccess('MEMBERS')) managementSubItems.push({ id: 'members', label: user?.role === 'COUNSELOR' ? 'Minha Unidade' : 'Membros', icon: Users, path: '/dashboard/members' });
        if (hasAccess('CLASSES')) managementSubItems.push({ id: 'classes', label: 'Classes', icon: BookOpen, path: '/dashboard/classes' });
        if (hasAccess('EVENTS')) managementSubItems.push({ id: 'events', label: 'Eventos', icon: Calendar, path: '/dashboard/events' });
        if (hasAccess('ATTENDANCE')) managementSubItems.push({ id: 'meetings', label: 'Chamada', icon: ListChecks, path: '/dashboard/meetings' });
        if (hasAccess('SECRETARY')) managementSubItems.push({ id: 'secretary', label: 'Secretaria', icon: FileText, path: '/dashboard/secretary' });
        if (hasAccess('APPROVALS')) managementSubItems.push({ id: 'approvals', label: 'Aprovações', icon: ListChecks, path: '/dashboard/approvals' });
        if (['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '')) {
            managementSubItems.push({ id: 'units', label: 'Unidades', icon: Shield, path: '/dashboard/units' });
        }

        if (managementSubItems.length > 0) {
            items.push({
                id: 'management',
                label: 'GESTÃO',
                icon: Building2,
                subItems: managementSubItems
            });
        }

        // 4. FINANCEIRO
        const financialSubItems: MenuItem[] = [];
        financialSubItems.push({ id: 'my-finance', label: 'Minhas Finanças', icon: DollarSign, path: '/dashboard/financial' });
        if (hasAccess('TREASURY')) {
            financialSubItems.push({ id: 'treasury', label: 'Tesouraria', icon: BarChart, path: '/dashboard/treasury' });
        }
        items.push({
            id: 'financial',
            label: 'FINANCEIRO',
            icon: DollarSign,
            subItems: financialSubItems
        });

        // 5. RELATÓRIOS / RANKING
        const reportsSubItems: MenuItem[] = [
            { id: 'ranking', label: 'Ranking Geral', icon: Award, path: '/dashboard/ranking' }
        ];
        if (hasAccess('TREASURY') || ['OWNER', 'ADMIN'].includes(user?.role || '')) {
            reportsSubItems.push({ id: 'reports', label: 'Relatórios & Métricas', icon: BarChart, path: '/dashboard/reports' });
        }
        items.push({
            id: 'reports',
            label: 'RELATÓRIOS',
            icon: BarChart,
            subItems: reportsSubItems
        });

        // 6. LOJA
        items.push({
            id: 'store',
            label: 'LOJA',
            icon: ShoppingBag,
            path: '/dashboard/store'
        });

        // 7. CONFIGURAÇÕES (Admin/Master)
        if (['OWNER', 'ADMIN', 'MASTER'].includes(user?.role || '')) {
            const configSubItems: MenuItem[] = [];
            configSubItems.push({ id: 'settings', label: 'Configurações', icon: Settings, path: '/dashboard/settings' });

            if (user?.role === 'MASTER' || user?.email === 'master@cantinhodbv.com') {
                configSubItems.push({ id: 'master-clubs', label: 'Gerenciar Clubes', icon: Globe, path: '/dashboard/clubs' });
                configSubItems.push({ id: 'master-hierarchy', label: 'Hierarquia', icon: Globe, path: '/dashboard/hierarchy' });
                configSubItems.push({ id: 'master-treasury', label: 'Tesouraria Master', icon: DollarSign, path: '/dashboard/master-treasury' });
                configSubItems.push({ id: 'system-messages', label: 'Mensagens Sistema', icon: AlertTriangle, path: '/dashboard/system-messages' });
            }

            items.push({
                id: 'config',
                label: 'CONFIG',
                icon: Settings,
                subItems: configSubItems
            });
        }

        return items;
    };

    const menuItems = getMenuItems();
    const activeItem = menuItems.find(item => item.id === activeMenu);

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 flex transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

                {/* Level 1: Main Sidebar */}
                <div style={{ backgroundColor: COLORS.primary }} className="w-24 flex flex-col items-center py-4 h-full shadow-lg relative z-20">
                    <div className="mb-6 px-2">
                        {/* Compact Logo */}
                        <img src="/logo.png" alt="DBV" className="w-12 h-12 object-contain brightness-0 invert" />
                    </div>

                    <nav className="flex-1 w-full space-y-1 overflow-y-auto scrollbar-none">
                        {menuItems.map(item => {
                            const isActive = activeMenu === item.id;
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setActiveMenu(item.id);
                                        // If it has no subitems, we might want to navigate immediately if path exists
                                        // Usually Link handles navigation. If item has path, it's a Link.
                                        // If item has subItems, it just opens the drawer.
                                    }}
                                    className={`
                                        group flex flex-col items-center justify-center py-3 cursor-pointer w-full transition-colors relative
                                        ${isActive ? 'bg-black/10' : 'hover:bg-black/5'}
                                    `}
                                >
                                    {item.path ? (
                                        <Link to={item.path} className="flex flex-col items-center w-full" onClick={() => setActiveMenu(item.id)}>
                                            <Icon className="w-8 h-8 text-white mb-1 stroke-[1.5]" />
                                            <span className="text-[10px] font-medium text-white tracking-wide text-center leading-tight px-1">{item.label}</span>
                                        </Link>
                                    ) : (
                                        <div className="flex flex-col items-center w-full">
                                            <Icon className="w-8 h-8 text-white mb-1 stroke-[1.5]" />
                                            <span className="text-[10px] font-medium text-white tracking-wide text-center leading-tight px-1">{item.label}</span>
                                        </div>
                                    )}

                                    {/* Active Indicator Bar on Left */}
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/80 rounded-r" />
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    <div className="pt-4 border-t border-white/20 w-full flex flex-col items-center">
                        <button onClick={logout} className="p-2 hover:bg-black/10 rounded-lg transition-colors group">
                            <LogOut className="w-6 h-6 text-white/80 group-hover:text-white" />
                        </button>
                    </div>
                </div>

                {/* Level 2: Submenu Drawer */}
                {/* This drawer appears NEXT to the main sidebar when an item with subItems is active */}

                <div
                    className={`
                        w-64 bg-white border-r border-slate-200 shadow-xl h-full transition-all duration-300 ease-in-out
                        flex flex-col
                        ${activeItem?.subItems ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 w-0 overflow-hidden'}
                    `}
                    style={{ backgroundColor: '#F8F9FA' }} // Light gray for contrast against green 
                >
                    {activeItem?.subItems && (
                        <>
                            <div className="p-5 border-b border-slate-200/60 bg-white">
                                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                    <activeItem.icon className="w-5 h-5 text-lime-600" />
                                    {activeItem.label}
                                </h2>
                            </div>
                            <div className="p-4 space-y-1 overflow-y-auto flex-1">
                                {activeItem.subItems.map(sub => {
                                    const SubIcon = sub.icon;
                                    const isSubActive = location.pathname === sub.path;
                                    return (
                                        <Link
                                            key={sub.id}
                                            to={sub.path || '#'}
                                            onClick={() => setMobileOpen(false)} // Close mobile menu on navigate
                                            className={`
                                                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                                                ${isSubActive
                                                    ? 'bg-lime-100 text-lime-700 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white hover:shadow-sm'}
                                            `}
                                        >
                                            <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-lime-600' : 'text-slate-400'}`} />
                                            {sub.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}
