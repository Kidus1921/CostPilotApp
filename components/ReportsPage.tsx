
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { Project, Task, ProjectStatus, ExpenseCategory, UserRole } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { exportTableToExcel, exportElementAsPDF } from '../services/exportService';
import { FileExcelIcon, FilePdfIcon, ChevronDownIcon, XCircleIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon } from './IconComponents';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
const formatDate = (date: Date) => date.toISOString().split('T')[0];

const KpiCard: React.FC<{ title: string; value: string; subtext?: string; colorClass?: string; }> = ({ title, value, subtext, colorClass = 'text-brand-primary' }) => (
    <div className="bg-base-100 dark:bg-gray-800 p-6 rounded-xl shadow-md transition-transform transform hover:scale-105">
        <p className="text-sm font-medium text-base-content-secondary uppercase dark:text-gray-400">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${colorClass} dark:text-teal-400`}>{value}</p>
        {subtext && <p className="text-xs text-base-content-secondary dark:text-gray-500 mt-1">{subtext}</p>}
    </div>
);

const ReportsPage: React.FC = () => {
    const { projects, users, currentUser, checkPermission } = useAppContext();
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);
    
    // Sort logic removed for brevity, assuming standard sort
    const canExport = checkPermission('can_export_reports');

    const filteredProjects = useMemo(() => {
        let list = projects;
        if (selectedProjectIds.length > 0) list = list.filter(p => selectedProjectIds.includes(p.id!));
        if (selectedStatuses.length > 0) list = list.filter(p => selectedStatuses.includes(p.status));
        return list;
    }, [projects, selectedProjectIds, selectedStatuses]);

    const reportData = useMemo(() => {
        const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
        const totalSpent = filteredProjects.reduce((sum, p) => sum + (p.spent || 0), 0);
        const variance = totalBudget - totalSpent;
        const statusDist = filteredProjects.reduce((acc, p) => { 
            acc[p.status] = (acc[p.status] || 0) + 1; 
            return acc; 
        }, {} as Record<string, number>);
        const distData = Object.entries(statusDist).map(([name, value]) => ({ name, value }));

        return { totalBudget, totalSpent, variance, distData };
    }, [filteredProjects]);

    const COLORS: any = { 
        [ProjectStatus.InProgress]: '#3B82F6', 
        [ProjectStatus.Completed]: '#10B981', 
        [ProjectStatus.OnHold]: '#f3c613', 
        [ProjectStatus.Pending]: '#6B7280',
        [ProjectStatus.Rejected]: '#EF4444' 
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold dark:text-white">Analytics</h2>
                {canExport && <div className="flex gap-2"><button onClick={() => exportTableToExcel('report-table')} className="bg-green-600 text-white py-2 px-4 rounded-lg flex gap-2"><FileExcelIcon/> Excel</button></div>}
            </div>

            <div className="bg-base-100 p-4 rounded-xl shadow-md dark:bg-gray-800 flex gap-4">
                <select multiple className="border rounded p-2 h-20" onChange={e => setSelectedProjectIds(Array.from(e.target.selectedOptions, (o: HTMLOptionElement) => o.value))}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <button onClick={() => { setSelectedProjectIds([]); setSelectedStatuses([]); }} className="text-red-500 flex items-center gap-1"><XCircleIcon className="w-5 h-5"/> Clear</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Total Budget" value={formatCurrency(reportData.totalBudget)} />
                <KpiCard title="Total Spent" value={formatCurrency(reportData.totalSpent)} />
                <KpiCard title="Variance" value={formatCurrency(reportData.variance)} colorClass={reportData.variance >= 0 ? 'text-green-500' : 'text-red-500'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800 h-80">
                    <h3 className="font-bold mb-4 dark:text-white">Project Status</h3>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={reportData.distData} dataKey="value" nameKey="name" outerRadius={80} label>
                                {reportData.distData.map((e: any, i: number) => <Cell key={i} fill={COLORS[e.name] || '#888'} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800">
                <table id="report-table" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr><th className="px-6 py-3 text-left text-xs font-bold uppercase dark:text-white">Project</th><th className="px-6 py-3 text-left text-xs font-bold uppercase dark:text-white">Budget</th><th className="px-6 py-3 text-left text-xs font-bold uppercase dark:text-white">Spent</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredProjects.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 dark:text-white">{p.title}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{formatCurrency(p.budget)}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{formatCurrency(p.spent)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReportsPage;
