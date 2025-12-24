import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Award,
    LogOut,
    Menu,
    X,
    Shield, // For Clubes/Admin
    UserCircle, // For Profile
    Calendar,
    User,
    DollarSign,
    ShoppingBag,
    ListChecks,
    ChevronRight,
    AlertTriangle,
    BookOpen,
    Loader2,
    HelpCircle,
    Building2,
    BarChart,
    RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from '../components/NotificationBell';
import { HelpButton } from '../components/HelpButton';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [specialtiesOpen, setSpecialtiesOpen] = useState(false);


    // Pull to Refresh Logic
    const mainRef = useRef<HTMLDivElement>(null);
    const { pullDistance } = usePullToRefresh(mainRef, () => window.location.reload());

    // Main Section States
    const [sectionsOpen, setSectionsOpen] = useState({
        geral: true,
        meuAcesso: true,
        gestao: true,
        acompanhamento: true,
        config: false
    });

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const navigate = useNavigate();
    const { logout, user } = useAuth();

    // Fetch Club Settings for Permissions
    const { data: clubData } = useQuery({
        queryKey: ['club-settings-layout', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return null;
            const res = await api.get(`/clubs/${user.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId,
        staleTime: 1000 * 60 * 5 // Cache for 5 mins
    });

    // Auto-open Config for Master
    useEffect(() => {
        if (user?.email === 'master@rankingdbv.com' || user?.role === 'MASTER') {
            setSectionsOpen(prev => ({ ...prev, config: true }));
        }
    }, [user]);
    // Check Overdue Status (Dynamic)
    let isClubOverdue = false;
    if (clubData) {
        if (clubData.subscriptionStatus === 'OVERDUE' || clubData.subscriptionStatus === 'CANCELED') {
            isClubOverdue = true;
        } else if (clubData.nextBillingDate) {
            const today = new Date();
            const billingDate = new Date(clubData.nextBillingDate);
            const gracePeriod = (clubData.gracePeriodDays && !isNaN(Number(clubData.gracePeriodDays))) ? Number(clubData.gracePeriodDays) : 0;
            const cutoffDate = new Date(billingDate);
            cutoffDate.setDate(cutoffDate.getDate() + gracePeriod);
            // Compare purely by time is fine (server does the same)
            if (today > cutoffDate) isClubOverdue = true;
        }
    }

    const hasAccess = (moduleKey: string) => {
        if (!user) return false;
        if (['OWNER', 'ADMIN'].includes(user.role)) return true; // Master/Admin always has access

        const perms = clubData?.settings?.permissions || {
            // Fallback Defaults if not configured
            SECRETARY: ['SECRETARY', 'MEMBERS', 'ATTENDANCE', 'EVENTS'],
            TREASURER: ['TREASURY'],
            COUNSELOR: ['MEMBERS', 'ATTENDANCE', 'EVENTS'],
            INSTRUCTOR: ['CLASSES', 'MEMBERS', 'EVENTS'],
        };

        return perms[user.role]?.includes(moduleKey);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-100 flex relative">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed lg:sticky top-0 left-0 z-50 w-64 h-screen bg-slate-900 text-white transition-transform duration-200 ease-in-out flex flex-col shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <Link to="/dashboard" className="group">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-blue-500 transition-all">
                            Cantinho DBV
                        </h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Início / Home</p>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
                    {user?.role === 'PARENT' ? (
                        /* --- PARENT MENU --- */
                        <div className="space-y-1">
                            <Link
                                to="/dashboard/alerts"
                                className="flex items-center gap-3 px-4 py-2 text-red-400 font-bold hover:text-red-300 hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                            >
                                <div className="relative">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                </div>
                                <span>Alertas</span>
                            </Link>
                            <Link
                                to="/dashboard/child-activities"
                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                            >
                                <Users className="w-4 h-4" />
                                <span>Atividades do Filho</span>
                            </Link>
                            <Link
                                to="/dashboard/profile"
                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                            >
                                <UserCircle className="w-4 h-4" />
                                <span>Meu Perfil</span>
                            </Link>
                            <Link
                                to="/dashboard/financial"
                                className="flex items-center gap-3 px-4 py-2 text-emerald-400 font-bold hover:text-emerald-300 hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                            >
                                <DollarSign className="w-4 h-4" />
                                <span>Minhas Finanças</span>
                            </Link>
                            <Link
                                to="/dashboard"
                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span>Painel Principal</span>
                            </Link>
                            <Link
                                to="/dashboard/ranking"
                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                            >
                                <Award className="w-4 h-4" />
                                <span>Ranking Geral</span>
                            </Link>
                        </div>
                    ) : (
                        /* --- STANDARD MENU --- */
                        <>
                            {/* --- GERAL --- */}
                            <div className="space-y-1">
                                <div
                                    className="flex items-center justify-between px-4 py-1 pb-2 cursor-pointer group"
                                    onClick={() => toggleSection('geral')}
                                >
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Geral</p>
                                    <ChevronRight className={`w-3 h-3 text-slate-600 transition-transform ${sectionsOpen.geral ? 'rotate-90' : ''}`} />
                                </div>
                                {sectionsOpen.geral && (
                                    <div className="space-y-1">
                                        {!isClubOverdue && (
                                            <Link
                                                to="/dashboard/store"
                                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                            >
                                                <ShoppingBag className="w-4 h-4" />
                                                <span>Loja Virtual</span>
                                            </Link>
                                        )}
                                        <Link
                                            to="/dashboard"
                                            className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            <span>Painel Principal</span>
                                        </Link>
                                        {!isClubOverdue && (
                                            <Link
                                                to="/dashboard/ranking"
                                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                            >
                                                <Award className="w-4 h-4" />
                                                <span>Ranking Geral</span>
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* --- MEU ACESSO --- */}
                            {!isClubOverdue && (
                                <div className="space-y-1">
                                    <div
                                        className="flex items-center justify-between px-4 py-1 pb-2 cursor-pointer group"
                                        onClick={() => toggleSection('meuAcesso')}
                                    >
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Meu Acesso</p>
                                        <ChevronRight className={`w-3 h-3 text-slate-600 transition-transform ${sectionsOpen.meuAcesso ? 'rotate-90' : ''}`} />
                                    </div>
                                    {sectionsOpen.meuAcesso && (
                                        <div className="space-y-1">
                                            <Link
                                                to="/dashboard/profile"
                                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                            >
                                                <UserCircle className="w-4 h-4" />
                                                <span>Meu Perfil</span>
                                            </Link>
                                            <Link
                                                to="/dashboard/requirements"
                                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                            >
                                                <ListChecks className="w-4 h-4" />
                                                <span>Meus Requisitos</span>
                                            </Link>
                                            {['PARENT', 'OWNER', 'ADMIN'].includes(user?.role || '') && (
                                                <Link
                                                    to="/dashboard/family"
                                                    className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                >
                                                    <User className="w-4 h-4" />
                                                    <span>Minha Família</span>
                                                </Link>
                                            )}
                                            <Link
                                                to="/dashboard/activities"
                                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                            >
                                                <Award className="w-4 h-4" />
                                                <span>Minhas Atividades</span>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                            )}

                            {/* --- GESTÃO (ADMIN) --- */}
                            {!isClubOverdue && (['OWNER', 'ADMIN'].includes(user?.role || '') ||
                                hasAccess('MEMBERS') || hasAccess('CLASSES') || hasAccess('ATTENDANCE') || hasAccess('EVENTS') || hasAccess('TREASURY') || hasAccess('SECRETARY') || hasAccess('APPROVALS')
                            ) && (
                                    <div className="space-y-1">
                                        <div
                                            className="flex items-center justify-between px-4 py-1 pb-2 cursor-pointer group"
                                            onClick={() => toggleSection('gestao')}
                                        >
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Gestão do Clube</p>
                                            <ChevronRight className={`w-3 h-3 text-slate-600 transition-transform ${sectionsOpen.gestao ? 'rotate-90' : ''}`} />
                                        </div>
                                        {sectionsOpen.gestao && (
                                            <div className="space-y-1">
                                                {hasAccess('ATTENDANCE') && (
                                                    <Link
                                                        to="/dashboard/meetings"
                                                        className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                        <span>Chamada / Presença</span>
                                                    </Link>
                                                )}
                                                {hasAccess('CLASSES') && (
                                                    <Link
                                                        to="/dashboard/classes"
                                                        className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                    >
                                                        <BookOpen className="w-4 h-4" />
                                                        <span>Classes</span>
                                                    </Link>
                                                )}
                                                {hasAccess('EVENTS') && (
                                                    <Link
                                                        to="/dashboard/events"
                                                        className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                        <span>Eventos</span>
                                                    </Link>
                                                )}
                                                {hasAccess('MEMBERS') && (
                                                    <Link
                                                        to="/dashboard/members"
                                                        className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                    >
                                                        <Users className="w-4 h-4" />
                                                        <span>{user?.role === 'COUNSELOR' ? 'Minha Unidade' : 'Membros'}</span>
                                                    </Link>
                                                )}
                                                {hasAccess('TREASURY') && (
                                                    <Link
                                                        to="/dashboard/reports"
                                                        className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                    >
                                                        <BarChart className="w-4 h-4" />
                                                        <span>Relatórios & Métricas</span>
                                                    </Link>
                                                )}
                                                {hasAccess('SECRETARY') && (
                                                    <Link
                                                        to="/dashboard/secretary"
                                                        className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                    >
                                                        <ListChecks className="w-4 h-4" />
                                                        <span>Secretaria</span>
                                                    </Link>
                                                )}
                                                {hasAccess('APPROVALS') && (
                                                    <Link
                                                        to="/dashboard/approvals"
                                                        className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                    >
                                                        <ListChecks className="w-4 h-4" />
                                                        <span>Solicitações (Aprovações)</span>
                                                    </Link>
                                                )}
                                                {hasAccess('TREASURY') && (
                                                    <Link
                                                        to="/dashboard/treasury"
                                                        className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                    >
                                                        <DollarSign className="w-4 h-4" />
                                                        <span>Tesouraria</span>
                                                    </Link>
                                                )}
                                                {['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '') && (
                                                    <Link
                                                        to="/dashboard/units"
                                                        className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                        <span>Unidades</span>
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                            {/* --- ACOMPANHAMENTO (ADMIN) --- */}
                            {!isClubOverdue && ['OWNER', 'ADMIN', 'INSTRUCTOR', 'COUNSELOR'].includes(user?.role || '') && (
                                <div className="space-y-1">
                                    <div
                                        className="flex items-center justify-between px-4 py-1 pb-2 cursor-pointer group"
                                        onClick={() => toggleSection('acompanhamento')}
                                    >
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Acompanhamento</p>
                                        <ChevronRight className={`w-3 h-3 text-slate-600 transition-transform ${sectionsOpen.acompanhamento ? 'rotate-90' : ''}`} />
                                    </div>

                                    {sectionsOpen.acompanhamento && (
                                        <div className="space-y-1">
                                            {/* Classes Retractable Menu */}
                                            {/* Classes Link (Simplified) */}
                                            <Link
                                                to="/dashboard/classes"
                                                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${location.pathname === '/dashboard/classes'
                                                    ? 'bg-blue-600/20 text-blue-400'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                <Award className="w-4 h-4" />
                                                <span>Progresso Classes</span>
                                            </Link>

                                            {/* Specialties Retractable Menu */}
                                            <div>
                                                <div
                                                    className="flex items-center justify-between px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg cursor-pointer transition-all text-sm"
                                                    onClick={() => setSpecialtiesOpen(!specialtiesOpen)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Award className="w-4 h-4" />
                                                        <span>Progresso Especialid.</span>
                                                    </div>
                                                    <ChevronRight className={`w-3 h-3 transition-transform ${specialtiesOpen ? 'rotate-90' : ''}`} />
                                                </div>
                                                {specialtiesOpen && (
                                                    <div className="ml-9 mt-1 space-y-1 border-l border-slate-800 pl-4">
                                                        <Link
                                                            to="/dashboard/specialties-dashboard"
                                                            className="block py-1.5 text-xs text-blue-400 font-bold hover:text-blue-300 transition-colors"
                                                        >
                                                            Visão Geral (Painel)
                                                        </Link>
                                                        {[
                                                            'ADRA',
                                                            'Artes e Habilidades Manuais',
                                                            'Atividades Agrícolas',
                                                            'Atividades Missionárias e Comunitárias',
                                                            'Atividades Profissionais',
                                                            'Atividades Recreativas',
                                                            'Ciência e Saúde',
                                                            'Estudo da Natureza',
                                                            'Habilidades Domésticas',
                                                            'Mestrados de Especialidades'
                                                        ].map(area => (
                                                            <Link
                                                                key={area}
                                                                to={`/dashboard/specialties?area=${encodeURIComponent(area)}`}
                                                                className="block py-1 text-xs text-slate-500 hover:text-white transition-colors"
                                                            >
                                                                {area}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- CONFIGURAÇÕES --- */}
                            {['OWNER', 'ADMIN', 'MASTER'].includes(user?.role || '') && (
                                <div className="space-y-1 pb-4">
                                    <div
                                        className="flex items-center justify-between px-4 py-1 pb-2 cursor-pointer group"
                                        onClick={() => toggleSection('config')}
                                    >
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Configurações</p>
                                        <ChevronRight className={`w-3 h-3 text-slate-600 transition-transform ${sectionsOpen.config ? 'rotate-90' : ''}`} />
                                    </div>
                                    {sectionsOpen.config && (
                                        <div className="space-y-1">
                                            {/* Master Link */}
                                            {(user?.email === 'master@rankingdbv.com' || user?.role === 'MASTER') && (
                                                <Link
                                                    to="/dashboard/hierarchy"
                                                    className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                                >
                                                    <Building2 className="h-4 w-4" />
                                                    <span className="font-medium">Gerenciar Assinatura</span>
                                                </Link>
                                            )}

                                            <Link
                                                to="/dashboard/settings"
                                                className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm"
                                            >
                                                <Shield className="w-4 h-4" />
                                                <span>Configurações & Backup</span>
                                            </Link>


                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-800 shrink-0 space-y-2">
                    <button
                        onClick={() => window.open('https://api.whatsapp.com/send?phone=5511999999999', '_blank')}
                        className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all text-sm font-medium"
                    >
                        <HelpCircle className="w-4 h-4" />
                        <span>Ajuda & Suporte</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 w-full text-red-400 hover:text-red-300 hover:bg-slate-800/50 rounded-lg transition-all text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sair da Conta</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div
                className="flex-1 flex flex-col min-h-screen overflow-hidden transition-transform duration-200 ease-out"
                style={pullDistance > 0 ? { transform: `translateY(${Math.min(pullDistance, 100)}px)` } : undefined}
            >
                {/* Pull Indicator */}
                {pullDistance > 10 && (
                    <div className="absolute top-0 left-0 w-full h-16 flex items-center justify-center text-slate-500 z-0">
                        {pullDistance > 150 ? (
                            <div className="flex items-center gap-2 text-blue-600 font-bold animate-pulse">
                                <Loader2 className="w-5 h-5 animate-spin" /> Atualizando...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-70">
                                <ChevronRight className="w-4 h-4 rotate-90" /> Puxe para atualizar
                            </div>
                        )}
                    </div>
                )}

                {/* Overdue Banner */}
                {isClubOverdue && (
                    <div className="bg-red-600 text-white px-4 py-3 text-center font-bold flex flex-col md:flex-row items-center justify-center gap-2 z-50 shadow-lg">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span>ATENÇÃO: A assinatura do clube está VENCIDA. O acesso dos membros está suspenso.</span>
                        </div>
                        {['OWNER', 'ADMIN'].includes(user?.role || '') && (
                            <a
                                href={`https://wa.me/5591983292005?text=${encodeURIComponent(`Olá, gostaria de resolver a pendência do Clube *${clubData?.name || 'N/A'}*.\nRegião: ${clubData?.region || 'N/A'}\nMissão: ${clubData?.mission || 'N/A'}\nUnião: ${clubData?.union || 'N/A'}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-red-600 px-4 py-1 rounded-full text-sm hover:bg-red-50 transition-colors uppercase tracking-wide flex items-center gap-2"
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-4 h-4" />
                                Resolver Agora
                            </a>
                        )}
                    </div>
                )}

                {/* Top Header */}
                <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-slate-500 hover:text-slate-700"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <button
                            onClick={() => window.location.reload()}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Atualizar Página"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <NotificationBell />

                        <Link to="/dashboard/profile" className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white shadow-sm">
                                {user?.name?.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'DBV'}
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-sm font-semibold text-slate-700 leading-none">{user?.name || 'Usuário'}</p>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 capitalize">{user?.role?.toLowerCase() || 'Membro'}</p>
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main ref={mainRef} className="flex-1 overflow-auto p-6 bg-slate-50 relative z-10">
                    <Outlet />
                </main>
            </div>
            <HelpButton />
        </div>
    );
}
