import { useState, useRef } from 'react';
import { Outlet, Link } from 'react-router-dom';
import {
    Menu,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_TRANSLATIONS } from '../pages/members/types';
import { NotificationBell } from '../components/NotificationBell';
import { HelpButton } from '../components/HelpButton';

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Pull to Refresh Logic
    // Pull to Refresh Logic Removed
    const mainRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();

    // Fetch Club Settings for Permissions (Still needed for Overdue check?)
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

    return (
        <div className="min-h-screen bg-slate-100 flex relative">
            <Sidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

            {/* Main Content */}
            {/* Added ml-24 lg:ml-24 to offset the fixed sidebar width. 
                Wait, if sidebar is sticky/fixed, the flex container might behave differently. 
                Let's use the 'flex' layout of the parent. 
                The Sidebar component returns an 'aside' with fixed position. 
                So we need to add left margin to main content equal to sidebar width (Level 1: w-24 = 6rem).
                If Level 2 is open, it pushes content? MarketUP usually pushes content or overlays.
                Let's make it push content by calculating width? No, that's complex with React state.
                Simplest: Fixed Sidebar (Level 1) + Drawer (Level 2).
                Main content should probably start after Level 1.
            */}

            <div
                className="flex-1 flex flex-col min-h-screen transition-all duration-200 ease-out lg:pl-24"
            >
                {/* Pull Indicator */}


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
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 capitalize">{ROLE_TRANSLATIONS[user?.role || '']?.toLowerCase() || (user?.role ? user.role.toLowerCase() : 'membro')}</p>
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
