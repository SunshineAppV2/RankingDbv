import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { SimpleBarChart } from '../components/Charts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'; // Import PieChart locally
import { Loader2, Users, DollarSign, CalendarCheck } from 'lucide-react';
import { formatCurrency } from '../lib/utils'; // Assuming this exists, or I'll implement inline

export function Reports() {
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(true);
    const [demographics, setDemographics] = useState<any>(null);
    const [financials, setFinancials] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [academic, setAcademic] = useState<any>(null);
    const [points, setPoints] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [demoRes, finRes, attRes, acadRes, ptsRes] = await Promise.all([
                api.get('/reports/demographics'),
                api.get('/reports/financial'),
                api.get('/reports/attendance'),
                api.get('/reports/academic'),
                api.get('/reports/points')
            ]);
            setDemographics(demoRes.data);
            setFinancials(finRes.data);
            setAttendance(attRes.data);
            setAcademic(acadRes.data);
            setPoints(ptsRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    // Chart Data Preparation
    const ageData = demographics ? Object.entries(demographics.ageGroups).map(([name, value]) => ({ name, value })) : [];
    const genderData = demographics ? Object.entries(demographics.gender).map(([name, value]) => ({ name: name === 'Male' ? 'Masculino' : 'Feminino', value })) : [];
    const roleData = demographics ? Object.entries(demographics.roles).map(([name, value]) => ({ name, value })) : [];

    // Financial Data for Bar Chart
    // Financial Data for Bar Chart
    const financialBarData = financials ? [
        { name: 'Receitas', value: financials.income },
        { name: 'Despesas', value: financials.expense }
    ] : [];

    // Academic Data
    const classesData = academic ? Object.entries(academic.classes).map(([name, value]) => ({ name, value })) : [];

    // Points Data
    const pointsFaixaData = points ? [
        { name: 'Faixa A (10-12)', value: points.pointsFaixaA },
        { name: 'Faixa B (13-15)', value: points.pointsFaixaB }
    ] : [];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Relatórios e Métricas</h1>
                <p className="text-slate-500">Visão geral da saúde do clube</p>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Users className="w-8 h-8" /></div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium uppercase">Membros Ativos</p>
                        <p className="text-2xl font-bold text-slate-800">{demographics?.total || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-full text-green-600"><DollarSign className="w-8 h-8" /></div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium uppercase">Saldo em Caixa</p>
                        <p className="text-2xl font-bold text-slate-800">{formatCurrency(financials?.balance || 0)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-full text-purple-600"><CalendarCheck className="w-8 h-8" /></div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium uppercase">Última Reunião</p>
                        <p className="text-2xl font-bold text-slate-800">{attendance && attendance.length > 0 ? attendance[0].present : 0} <span className="text-sm font-normal text-slate-400">presentes</span></p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 overflow-x-auto">
                <nav className="-mb-px flex gap-6">
                    {['general', 'financial', 'attendance', 'academic', 'points'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {tab === 'general' && 'Demografia'}
                            {tab === 'financial' && 'Financeiro'}
                            {tab === 'attendance' && 'Frequência'}
                            {tab === 'academic' && 'Acadêmico'}
                            {tab === 'points' && 'Pontuação'}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="py-4">
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SimpleBarChart
                            title="Faixa Etária"
                            data={ageData}
                            dataKeyName="name"
                            dataKeyValue="value"
                            color="#3b82f6"
                        />
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Distribuição por Sexo</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={genderData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {genderData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <SimpleBarChart
                            title="Cargos e Funções"
                            data={roleData}
                            dataKeyName="name"
                            dataKeyValue="value"
                            color="#8b5cf6"
                        />
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SimpleBarChart
                            title="Receitas vs Despesas (Total)"
                            data={financialBarData}
                            dataKeyName="name"
                            dataKeyValue="value"
                            color="#10b981"
                        />
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center space-y-6">
                            <div>
                                <h3 className="text-slate-500 font-medium uppercase mb-2">A Receber (Pendentes)</h3>
                                <p className="text-4xl font-bold text-orange-500">{formatCurrency(financials?.pendingReceivables || 0)}</p>
                                <p className="text-sm text-slate-400 mt-2">Mensalidades ou taxas em aberto</p>
                            </div>
                            <div className="w-full bg-slate-50 p-4 rounded-lg flex justify-between items-center text-sm">
                                <span className="text-slate-600">Entradas Totais:</span>
                                <span className="font-bold text-green-600">{formatCurrency(financials?.income || 0)}</span>
                            </div>
                            <div className="w-full bg-slate-50 p-4 rounded-lg flex justify-between items-center text-sm">
                                <span className="text-slate-600">Saídas Totais:</span>
                                <span className="font-bold text-red-600">{formatCurrency(financials?.expense || 0)}</span>
                            </div>
                        </div>
                    </div>
                )}


                {activeTab === 'attendance' && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Presença nas Últimas Reuniões</h3>
                        <SimpleBarChart
                            title=""
                            data={attendance || []}
                            dataKeyName="date"
                            dataKeyValue="present"
                            color="#f59e0b"
                        />
                    </div>
                )}

                {activeTab === 'academic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SimpleBarChart
                            title="Membros por Classe"
                            data={classesData}
                            dataKeyName="name"
                            dataKeyValue="value"
                            color="#ec4899"
                        />
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center space-y-6">
                            <div>
                                <h3 className="text-slate-500 font-medium uppercase mb-2">Especialidades Concluídas</h3>
                                <p className="text-5xl font-bold text-pink-600">{academic?.totalSpecialties || 0}</p>
                                <p className="text-sm text-slate-400 mt-2">Total histórico do clube</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'points' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center space-y-6">
                            <div>
                                <h3 className="text-slate-500 font-medium uppercase mb-2">Pontos Distribuídos</h3>
                                <p className="text-5xl font-bold text-amber-500">{points?.totalPoints || 0}</p>
                                <p className="text-sm text-slate-400 mt-2">Total geral acumulado</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Pontos por Faixa Etária</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pointsFaixaData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pointsFaixaData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
