import { useState } from 'react';
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
    BookOpen,
    CreditCard
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



export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (o: boolean) => void }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Close secondary menu when clicking outside (handled by layout overlay usually, but simple state here)
    // Auto-select menu based on current path - REMOVED EFFECT to prevent auto-reopening. 
    // Now derived active state is used for highlighting, but state is used for drawer.

    const getActiveIdFromPath = (path: string) => {
        if (path === '/dashboard') return 'dashboard';
        if (path.includes('/profile') || path.includes('/family') || path.includes('/requirements') || path.includes('/activities')) return 'access';
        if (path.includes('/members') || path.includes('/classes') || path.includes('/events') || path.includes('/meetings') || path.includes('/secretary') || path.includes('/approvals')) return 'management';
        if (path.includes('/financial') || path.includes('/treasury') || path.includes('/master-treasury')) return 'financial';
        if (path.includes('/reports') || path.includes('/ranking') || path.includes('/signatures')) return 'reports';
        if (path.includes('/regional-ranking') || path.includes('/coordinator-approvals') || path.includes('/hierarchy')) return 'coordinator';
        if (path.includes('/store')) return 'store';
        if (path.includes('/settings') || path.includes('/admin')) return 'config';
        return null;
    };

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
        if (['OWNER', 'ADMIN', 'MASTER', 'DIRECTOR'].includes(user.role)) return true;
        const perms = clubData?.settings?.permissions || {
            SECRETARY: ['SECRETARY', 'MEMBERS', 'ATTENDANCE', 'EVENTS'],
            TREASURER: ['TREASURY'],
            COUNSELOR: ['MEMBERS', 'ATTENDANCE', 'EVENTS'],
            INSTRUCTOR: ['CLASSES', 'MEMBERS', 'EVENTS'],
        };
        return perms[user.role]?.includes(moduleKey);
    };

    const getMenuItems = (): MenuItem[] => {
        const items: MenuItem[] = [];

        // Detect roles
        const isMaster = user?.role === 'MASTER' || user?.email === 'master@cantinhodbv.com';
        const isPureCoordinator = ['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA'].includes(user?.role || '');
        const isCoordinator = isMaster || isPureCoordinator || user?.role === 'OWNER';

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
        ];

        if (!isPureCoordinator) {
            accessSubItems.push({ id: 'requirements', label: 'Meus Requisitos', icon: ListChecks, path: '/dashboard/requirements' });
            accessSubItems.push({ id: 'my-activities', label: 'Minhas Atividades', icon: Award, path: '/dashboard/activities' });
        }

        if (['PARENT', 'OWNER', 'ADMIN', 'MASTER'].includes(user?.role || '')) {
            accessSubItems.push({ id: 'family', label: 'Minha Família', icon: Users, path: '/dashboard/family' });
        }

        items.push({
            id: 'access',
            label: 'MEU ACESSO',
            icon: UserCircle,
            subItems: accessSubItems
        });

        if (user?.role === 'PARENT') {
            items.push({
                id: 'alerts',
                label: 'ALERTAS',
                icon: AlertTriangle,
                path: '/dashboard/alerts'
            })
        }

        // 3. GESTÃO (Management) - Hide for Pure Coordinators
        if (!isPureCoordinator) {
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
        }

        // 3.5 COORDENAÇÃO (Coordinator Section)
        if (isCoordinator) {
            const coordinatorSubItems: MenuItem[] = [
                { id: 'regional-ranking', label: 'Ranking Regional', icon: Award, path: '/dashboard/regional-ranking' }
            ];

            if (user?.role !== 'OWNER') {
                coordinatorSubItems.push({ id: 'coordinator-approvals', label: 'Intervenções', icon: Shield, path: '/dashboard/coordinator-approvals' });
                coordinatorSubItems.push({ id: 'hierarchy', label: 'Clubes / Hierarquia', icon: Globe, path: '/dashboard/hierarchy' });
            }

            items.push({
                id: 'coordinator',
                label: 'COORDENAÇÃO',
                icon: Shield,
                subItems: coordinatorSubItems
            });
        }

        // 4. FINANCEIRO - Hide for Pure Coordinators
        if (!isPureCoordinator) {
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
        }

        // 5. RELATÓRIOS / RANKING
        const reportsSubItems: MenuItem[] = [
            { id: 'ranking', label: 'Ranking Geral', icon: Award, path: '/dashboard/ranking' }
        ];
        if (isCoordinator) {
            reportsSubItems.push({ id: 'regional-ranking-alt', label: 'Ranking Regional', icon: Award, path: '/dashboard/regional-ranking' });
        }
        if (isCoordinator || hasAccess('TREASURY') || ['OWNER', 'ADMIN'].includes(user?.role || '')) {
            reportsSubItems.push({ id: 'reports', label: 'Relatórios & Métricas', icon: BarChart, path: '/dashboard/regional-dashboard' }); // Redirect to new dash
        }
        items.push({
            id: 'reports',
            label: 'RELATÓRIOS',
            icon: BarChart,
            subItems: reportsSubItems
        });

        // 6. LOJA - Hide for Pure Coordinators
        if (!isPureCoordinator) {
            items.push({
                id: 'store',
                label: 'LOJA',
                icon: ShoppingBag,
                path: '/dashboard/store'
            });
        }

        // 7. CONFIGURAÇÕES (Admin/Master)
        if (['OWNER', 'ADMIN', 'MASTER'].includes(user?.role || '')) {
            const configSubItems: MenuItem[] = [];
            configSubItems.push({ id: 'settings', label: 'Configurações', icon: Settings, path: '/dashboard/settings' });

            if (isMaster) {
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

        // 8. ASSINATURA (Conditional Link)
        // Check local data or user status. Ideally we use clubData from query.
        const subscriptionStatus = clubData?.subscriptionStatus;
        const clubStatus = clubData?.status;
        const isCritical = subscriptionStatus === 'OVERDUE' || clubStatus === 'SUSPENDED' || clubStatus === 'INACTIVE';

        if (isCritical && ['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '')) {
            items.push({
                id: 'subscription',
                label: 'ASSINATURA',
                icon: CreditCard,
                path: '/dashboard/subscription'
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
                <div className="w-24 flex flex-col items-center py-4 h-full shadow-xl relative z-20 bg-slate-900 border-r border-slate-800">
                    <div className="mb-6 px-2">
                        {/* Compact Logo */}
                        <img src="/logo.png" alt="DBV" className="w-12 h-12 object-contain" />
                    </div>

                    <nav className="flex-1 w-full space-y-1 overflow-y-auto scrollbar-none">
                        {menuItems.map(item => {
                            // If activeMenu is set, use it. If not, fallback to URL match.
                            // BUT for the purposes of style, if drawer is open (activeMenu set), only that one is highlighted.
                            // If drawer closed (activeMenu null), we show current section's highlight.
                            const isActive = activeMenu === item.id || (!activeMenu && getActiveIdFromPath(location.pathname) === item.id);
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        // Toggle logic: if already active (drawer open), close it.
                                        if (activeMenu === item.id) setActiveMenu(null);
                                        else setActiveMenu(item.id);
                                    }}
                                    className={`
                                        group flex flex-col items-center justify-center py-3 cursor-pointer w-full transition-all relative
                                        ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'}
                                    `}
                                >
                                    {item.path ? (
                                        <Link
                                            to={item.path}
                                            className="flex flex-col items-center w-full"
                                            onClick={() => setActiveMenu(null)} // If it's a direct link (like Dashboard), close any open drawer? Or just set active?
                                        // Actually, layout usually keeps dashboard active. 
                                        // But if I click 'Dashboard', I expect to go there.
                                        // Let's rely on the parent onClick for toggle IF it has subItems. 
                                        // If it has NO subItems (like Dashboard), parent onClick sets it active.
                                        >
                                            <Icon className={`w-8 h-8 mb-1 stroke-[1.5] ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-white'}`} />
                                            <span className="text-[10px] font-medium tracking-wide text-center leading-tight px-1">{item.label}</span>
                                        </Link>
                                    ) : (
                                        <div className="flex flex-col items-center w-full">
                                            <Icon className={`w-8 h-8 mb-1 stroke-[1.5] ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-white'}`} />
                                            <span className="text-[10px] font-medium tracking-wide text-center leading-tight px-1">{item.label}</span>
                                        </div>
                                    )}

                                    {/* Active Indicator Bar on Left */}
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    <div className="pt-4 border-t border-slate-800 w-full flex flex-col items-center">
                        <button onClick={logout} className="p-2 hover:bg-slate-800 rounded-lg transition-colors group">
                            <LogOut className="w-6 h-6 text-slate-500 group-hover:text-red-400" />
                        </button>
                    </div>
                </div>

                {/* Level 2: Submenu Drawer */}
                {/* Dark Theme for Drawer */}
                <div
                    className={`
                        w-64 bg-slate-900 border-r border-slate-800 shadow-2xl h-full transition-all duration-300 ease-in-out
                        flex flex-col
                        ${activeItem?.subItems ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 w-0 overflow-hidden'}
                    `}
                >
                    {activeItem?.subItems && (
                        <>
                            <div className="p-5 border-b border-slate-800 bg-slate-900">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <activeItem.icon className="w-5 h-5 text-blue-500" />
                                    {activeItem.label}
                                </h2>
                            </div>
                            <div className="p-4 space-y-1 overflow-y-auto flex-1 bg-slate-900">
                                {activeItem.subItems.map(sub => {
                                    const SubIcon = sub.icon;
                                    const isSubActive = location.pathname === sub.path;
                                    return (
                                        <Link
                                            key={sub.id}
                                            to={sub.path || '#'}
                                            onClick={() => {
                                                setMobileOpen(false); // Close mobile
                                                setActiveMenu(null); // Retract drawer (User request)
                                            }}
                                            className={`
                                                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                                                ${isSubActive
                                                    ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-600/20'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                                            `}
                                        >
                                            <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'}`} />
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
