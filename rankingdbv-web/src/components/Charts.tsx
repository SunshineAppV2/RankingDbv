
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// --- Base Interface ---
interface BaseChartProps {
    title: string;
    data: any[];
    height?: number;
}

// --- Bar Chart (Generic Single) ---
interface SimpleBarChartProps extends BaseChartProps {
    dataKeyName: string;
    dataKeyValue: string;
    color?: string;
}

export function SimpleBarChart({ title, data, dataKeyName, dataKeyValue, color = "#3b82f6", height = 300 }: SimpleBarChartProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>
            <div style={{ width: '100%', height: height, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey={dataKeyName}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey={dataKeyValue} fill={color} radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// --- Bar Chart (Cash Flow - Dual) ---
interface CashFlowChartProps extends BaseChartProps {
    dataKeyName: string;
    dataKeyIncome: string;
    dataKeyExpense: string;
}

export function CashFlowChart({ title, data, dataKeyName, dataKeyIncome, dataKeyExpense, height = 300 }: CashFlowChartProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>
            <div style={{ width: '100%', height: height, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey={dataKeyName}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => `R$${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => [`R$ ${value?.toFixed(2) || '0.00'}`]}
                        />
                        <Legend />
                        <Bar name="Entradas" dataKey={dataKeyIncome} fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar name="Saídas" dataKey={dataKeyExpense} fill="#dc2626" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// --- Line Chart (Evolution) ---
interface SimpleLineChartProps extends BaseChartProps {
    dataKeyName: string;
    dataKeyValue: string;
}

export function SimpleLineChart({ title, data, dataKeyName, dataKeyValue, height = 300 }: SimpleLineChartProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>
            <div style={{ width: '100%', height: height, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey={dataKeyName}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => [`R$ ${value?.toFixed(2) || '0.00'}`]}
                        />
                        <Line
                            type="monotone"
                            name="Saldo"
                            dataKey={dataKeyValue}
                            stroke="#2563eb"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// --- Pie Chart (Distribution) ---
interface SimplePieChartProps extends BaseChartProps {
    dataKeyName: string;
    dataKeyValue: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function SimplePieChart({ title, data, dataKeyName, dataKeyValue, height = 300 }: SimplePieChartProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>
            <div style={{ width: '100%', height: height, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey={dataKeyValue}
                            nameKey={dataKeyName}
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number | undefined) => [`R$ ${value?.toFixed(2) || '0.00'}`]}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
