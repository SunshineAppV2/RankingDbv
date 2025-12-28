import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Trophy, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SimpleBarChart } from '../components/Charts';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { PullToRefreshWrapper } from '../components/PullToRefreshWrapper';
import { ROLE_TRANSLATIONS } from './members/types';

import { SubscriptionWidget } from '../components/SubscriptionWidget';
import { SignaturesWidget } from '../components/SignaturesWidget';

import { FamilyDashboard } from './FamilyDashboard';

// Firestore Imports
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showBirthdaysModal, setShowBirthdaysModal] = useState(false);
    // Redirect PARENTS to their dashboard view (reusing FamilyDashboard)
    if (user?.role === 'PARENT') {
        return <FamilyDashboard />;
    }

    // Stats Query from Firestore
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return null;
            const clubId = user.clubId;

            // 1. Members and Birthdays
            const usersQ = query(collection(db, 'users'), where('clubId', '==', clubId));
            const usersSnap = await getDocs(usersQ);
            const activeMembers = usersSnap.size;

            const currentMonth = new Date().getMonth();
            const birthdays = usersSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(u => {
                    if (!u.birthDate) return false;
                    const bd = new Date(u.birthDate);
                    return bd.getMonth() === currentMonth;
                })
                .map(u => ({
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    day: new Date(u.birthDate).getDate()
                }))
                .sort((a, b) => a.day - b.day);

            // 2. Next Event
            const today = new Date().toISOString();
            const eventsQ = query(
                collection(db, 'meetings'),
                where('clubId', '==', clubId),
                where('date', '>=', today),
                orderBy('date', 'asc'),
                limit(1)
            );
            const eventsSnap = await getDocs(eventsQ);
            const nextEvent = eventsSnap.empty ? null : {
                id: eventsSnap.docs[0].id,
                ...eventsSnap.docs[0].data(),
                startDate: eventsSnap.docs[0].data().date
            };

            // 3. Attendance Stats (Last 5 meetings)
            // WORKAROUND: Fetch all meetings (usually small number/year) and sort client side to avoid index requirement for now
            const allMeetingsQ = query(collection(db, 'meetings'), where('clubId', '==', clubId));
            const allMeetingsSnap = await getDocs(allMeetingsQ);

            const attendanceStats = allMeetingsSnap.docs
                .map(d => d.data())
                .filter(m => new Date(m.date) < new Date()) // Only past
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Ascending for chart
                .slice(-5) // Last 5
                .map((m: any) => ({
                    date: new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    count: m._count?.attendances || 0
                }));

            // 4. Financial
            // Assuming simplified model: club document has balance
            const clubSnap = await getDoc(doc(db, 'clubs', clubId));
            const financial = { balance: clubSnap.exists() ? ((clubSnap.data() as any).balance || 0) : 0 };

            return {
                activeMembers,
                birthdays,
                nextEvent: nextEvent as any,
                attendanceStats,
                financial
            };
        },
        enabled: !!user?.clubId
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-32 flex flex-col justify-between">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white h-80 rounded-xl border border-slate-200 p-6">
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-full w-full" />
                        </div>
                    </div>
                    <div className="bg-white h-80 rounded-xl border border-slate-200 p-6 space-y-4">
                        <Skeleton className="h-6 w-32" />
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                </div>
            </div>
        );
    }

    // Formatting Data for Charts
    const attendanceData = stats?.attendanceStats?.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        count: d.count
    })) || [];

    return (
        <PullToRefreshWrapper>
            <div className="space-y-6">

                {/* Subscription Status for Admins */}
                {['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '') && <SubscriptionWidget />}

                {/* Pending Signatures Widget */}
                <SignaturesWidget />

                <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>

                {/* Widgets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                    {/* Widget 1: Active Members */}
                    <div
                        onClick={() => navigate('/dashboard/members')}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                    >
                        <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Membros Ativos</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stats?.activeMembers || 0}</h3>
                        </div>
                    </div>

                    {/* Widget 2: Financial Balance */}
                    {['OWNER', 'ADMIN', 'DIRECTOR', 'TREASURER'].includes(user?.role || '') && (
                        <div
                            onClick={() => navigate('/dashboard/financial')}
                            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                        >
                            <div className={`p-3 rounded-lg ${(stats?.financial?.balance || 0) >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm">Saldo do Mês</p>
                                <h3 className={`text-2xl font-bold ${(stats?.financial?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    R$ {stats?.financial?.balance?.toFixed(0) || '0'}
                                </h3>
                            </div>
                        </div>
                    )}

                    {/* Widget 3: Next Event */}
                    <div
                        onClick={() => navigate('/dashboard/events')}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                    >
                        <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Próximo Evento</p>
                            <h3 className="text-lg font-bold text-slate-800 truncate max-w-[150px]" title={stats?.nextEvent?.title || 'Nenhum'}>
                                {stats?.nextEvent?.title || 'Nenhum'}
                            </h3>
                            {stats?.nextEvent && (
                                <p className="text-xs text-slate-500">
                                    {new Date(stats?.nextEvent?.startDate).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Widget 4: Birthdays Count */}
                    <div
                        onClick={() => setShowBirthdaysModal(true)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                    >
                        <div className="bg-pink-100 p-3 rounded-lg text-pink-600">
                            <Trophy className="w-8 h-8" /> {/* Using Trophy as placeholder icon for birthdays if Cake not available */}
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Aniversariantes</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stats?.birthdays?.length || 0}</h3>
                            <p className="text-xs text-slate-500">Neste Mês</p>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart: Attendance */}
                    <div className="lg:col-span-2">
                        <SimpleBarChart
                            title="Frequência nas Reuniões"
                            data={attendanceData}
                            dataKeyName="date"
                            dataKeyValue="count"
                            color="#3b82f6"
                        />
                    </div>

                    {/* Side Panel: Birthdays List */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">🎈 Aniversariantes</h3>
                        {stats?.birthdays?.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">Ninguém faz ano este mês.</p>
                        ) : (
                            <ul className="space-y-3">
                                {stats?.birthdays?.map((b: any) => (
                                    <li key={b.id} className="flex items-center gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                                            {b.day}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-800 text-sm">{b.name}</p>
                                            <p className="text-xs text-slate-400 capitalize">{ROLE_TRANSLATIONS[b.role] || b.role}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                {/* Birthdays Modal */}
                <Modal
                    isOpen={showBirthdaysModal}
                    onClose={() => setShowBirthdaysModal(false)}
                    title="🎈 Aniversariantes do Mês"
                >
                    {stats?.birthdays?.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">Ninguém faz aniversário este mês.</p>
                    ) : (
                        <ul className="space-y-4">
                            {stats?.birthdays?.map((b: any) => (
                                <li key={b.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/members?search=${b.name}`)}>
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                        {b.day}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{b.name}</p>
                                        <p className="text-sm text-slate-500 capitalize">{ROLE_TRANSLATIONS[b.role] || b.role}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Modal>
            </div >
        </PullToRefreshWrapper>
    );
}

