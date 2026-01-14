
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Project, Task, ProjectStatus, ExpenseCategory, TaskStatus } from '../../types';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { exportTableToExcel, exportElementAsPDF } from '../../services/exportService';
import { FileExcelIcon, FilePdfIcon, ChevronDownIcon, XCircleIcon, SearchIcon } from '../IconComponents';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
const formatDate = (date: Date) => date.toISOString().split('T')[0];

const KpiCard: React.FC<{ title: string; value: string; subtext?: string; colorClass?: string; bgClass?: string }> = ({ title, value, subtext, colorClass = 'text-brand-primary', bgClass = 'bg-base-100' }) => (
    <div className={`${bgClass} dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-base-300 dark:border-gray-700`}>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className={`text-2xl font-bold ${colorClass} truncate`}>{value}</p>
        {subtext && <p className="text-[9px] font-bold text-gray-500 uppercase mt-1 tracking-wider">{subtext}</p>}
    </div>
);

const MultiSelectDropdown: React.FC<{
    title: string;
    options: { value: string; label: string }[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    withSearch?: boolean;
}> = ({ title, options, selectedValues, onChange, withSearch = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (value: string) => {
        const newSelection = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelection);
    };

    const filteredOptions = useMemo(() =>
        options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        ), [options, searchTerm]);

    const buttonText = selectedValues.length > 0 ? `${title} (${selectedValues.length})` : title;

    return (
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full sm:w-56 bg-base-100 dark:bg-gray-700 border border-base-300 dark:border-gray-600 p-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-base-content dark:text-gray-200 hover:bg-base-200 transition-all">
                {buttonText}
                <ChevronDownIcon className={`w-4 h-4 text-brand-primary transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 right-0 sm:right-auto mt-2 sm:w-72 bg-base-100 dark:bg-gray-800 rounded-xl shadow-2xl border border-base-300 dark:border-gray-700 z-50 p-3">
                    {withSearch && (
                        <div className="relative mb-3">
                             <SearchIcon className="absolute w-4 h-4 text-gray-400 top-1/2 left-3 transform -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search scope..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 text-xs border border-base-300 rounded-lg bg-base-200 focus:ring-1 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    )}
                    <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                        {filteredOptions.map(option => (
                            <label key={option.value} className="flex items-center p-2 rounded-lg hover:bg-brand-primary/5 cursor-pointer group transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(option.value)}
                                    onChange={() => handleSelect(option.value)}
                                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary dark:bg-gray-900"
                                />
                                <span className="ml-3 text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-brand-primary">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const FinancialReportsTab: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const BRAND = {
        PRIMARY: '#d3a200',
        SECONDARY: '#f9dc5c',
        TERTIARY: '#c41034',
        DARK_RED: '#65081b',
        NEUTRAL: '#e5e7eb'
    };

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase.from('projects').select('*');
            if (error) {
                console.error("Financial reports fetch error:", error);
                setError("Could not load financial report data.");
            } else if (data) {
                const projectsData: Project[] = data.map((d: any) => {
                    const spent = (d.tasks || []).reduce((sum: number, task: any) => sum + (task.completionDetails?.actualCost || 0), 0);
                    return { ...d, spent };
                });
                setProjects(projectsData);
            }
            setLoading(false);
        };
        fetchProjects();
    }, []);

    const filteredTasks = useMemo(() => {
        let tasks = projects.flatMap(p =>
            selectedProjectIds.length === 0 || selectedProjectIds.includes(p.id!)
                ? (p.tasks || []).map(t => ({ ...t, projectId: p.id!, projectName: p.title, projectBudget: p.budget }))
                : []
        );

        if (selectedStatuses.length > 0) tasks = tasks.filter(t => selectedStatuses.includes(t.status));
        if (startDate) tasks = tasks.filter(t => t.completionDetails && new Date(t.completionDetails.completedAt) >= new Date(startDate));
        if (endDate) tasks = tasks.filter(t => t.completionDetails && new Date(t.completionDetails.completedAt) <= new Date(endDate));

        return tasks;
    }, [projects, selectedProjectIds, selectedStatuses, startDate, endDate]);

    const reportData = useMemo(() => {
        const relevantProjectIds = new Set(filteredTasks.map(t => t.projectId));
        const totalBudget = projects
            .filter(p => relevantProjectIds.has(p.id!))
            .reduce((sum, p) => sum + p.budget, 0);

        const totalActualCost = filteredTasks.reduce((sum, task) => sum + (task.completionDetails?.actualCost || 0), 0);
        const variance = totalBudget - totalActualCost;
        const budgetUtilization = totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0;

        const categoryBreakdown = filteredTasks.reduce((acc, task) => {
            if (task.completionDetails) {
                const category = task.completionDetails.category || ExpenseCategory.Miscellaneous;
                acc[category] = (acc[category] || 0) + task.completionDetails.actualCost;
            }
            return acc;
        }, {} as Record<string, number>);

        const spendingOverTime = filteredTasks
            .filter(t => t.completionDetails)
            .sort((a, b) => new Date(a.completionDetails!.completedAt).getTime() - new Date(b.completionDetails!.completedAt).getTime())
            .reduce((acc, task) => {
                const date = formatDate(new Date(task.completionDetails!.completedAt));
                const lastEntry = acc[acc.length - 1];
                const newCost = (lastEntry ? lastEntry.cost : 0) + task.completionDetails!.actualCost;
                if (lastEntry && lastEntry.date === date) {
                    lastEntry.cost = newCost;
                } else {
                    acc.push({ date, cost: newCost });
                }
                return acc;
            }, [] as { date: string; cost: number }[]);

        return {
            totalBudget,
            totalActualCost,
            variance,
            budgetUtilization,
            categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
            spendingOverTime
        };
    }, [filteredTasks, projects]);

    const CATEGORY_COLORS = [BRAND.PRIMARY, BRAND.DARK_RED, BRAND.SECONDARY, BRAND.TERTIARY, '#333333', '#777777'];

    if (loading) return <div className="p-20 text-center animate-pulse uppercase tracking-[0.3em] font-bold text-gray-500">Generating Audit...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h2 className="text-2xl font-bold text-base-content dark:text-gray-100 uppercase tracking-widest">Financial Analytics</h2>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => exportTableToExcel('financial-details-table', 'audit-details.xlsx')} className="bg-brand-primary text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:brightness-110 flex items-center gap-2 transition-all text-xs uppercase tracking-widest">
                        <FileExcelIcon className="w-4 h-4" /> Export Excel
                    </button>
                    <button onClick={() => exportElementAsPDF('financial-report-export', 'fiscal-report.pdf')} className="bg-brand-dark text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:brightness-110 flex items-center gap-2 transition-all text-xs uppercase tracking-widest border border-brand-primary/20">
                        <FilePdfIcon className="w-4 h-4"/> Export PDF
                    </button>
                </div>
            </div>

            <div className="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-300 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                     <div className="flex flex-wrap gap-3 flex-1">
                        <MultiSelectDropdown title="Scope: Projects" options={projects.map(p => ({ value: p.id!, label: p.title }))} selectedValues={selectedProjectIds} onChange={setSelectedProjectIds} withSearch />
                        <MultiSelectDropdown title="Filter: Task Status" options={Object.values(TaskStatus).map(s => ({ value: s, label: s }))} selectedValues={selectedStatuses} onChange={(vals) => setSelectedStatuses(vals as TaskStatus[])} />
                     </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-base-200/50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-base-300 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">From</span>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-base-content dark:text-white outline-none dark:[color-scheme:dark]"/>
                        </div>
                        <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">To</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-base-content dark:text-white outline-none dark:[color-scheme:dark]"/>
                        </div>
                    </div>
                    <button onClick={() => {setSelectedProjectIds([]); setSelectedStatuses([]); setStartDate(''); setEndDate('');}} className="p-2.5 text-gray-400 hover:text-brand-tertiary transition-colors" title="Reset All Filters">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div id="financial-report-export" className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard title="Portfolio Budget" value={formatCurrency(reportData.totalBudget)} subtext={selectedProjectIds.length > 0 ? `${selectedProjectIds.length} PROJS` : 'FULL PORTFOLIO'}/>
                    <KpiCard title="Total Consumption" value={formatCurrency(reportData.totalActualCost)} subtext={`${filteredTasks.length} AUDITED TASKS`} colorClass="text-base-content dark:text-white" bgClass="bg-base-200/30"/>
                    <KpiCard title="Fiscal Variance" value={formatCurrency(reportData.variance)} colorClass={reportData.variance >= 0 ? 'text-green-600' : 'text-brand-tertiary'} subtext={reportData.variance >= 0 ? 'UNDER BUDGET' : 'OVER BUDGET'}/>
                    <KpiCard title="Budget Health" value={`${reportData.budgetUtilization.toFixed(1)}%`} colorClass={reportData.budgetUtilization > 100 ? 'text-brand-tertiary' : 'text-brand-primary'} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3 bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 dark:bg-gray-800 dark:border-gray-700">
                        <h3 className="text-xs font-bold text-gray-400 mb-6 uppercase tracking-[0.2em]">Consumption Timeline</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={reportData.spendingOverTime} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff'}} formatter={(value: number) => formatCurrency(value)} />
                                    <Area type="monotone" dataKey="cost" stroke={BRAND.PRIMARY} fill={BRAND.PRIMARY} fillOpacity={0.15} strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 dark:bg-gray-800 dark:border-gray-700">
                        <h3 className="text-xs font-bold text-gray-400 mb-6 uppercase tracking-[0.2em]">Category Allocation</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={reportData.categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={8} stroke="none">
                                        {reportData.categoryBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff'}} formatter={(value: number) => formatCurrency(value)} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px', textTransform: 'uppercase' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

             <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
                 <div className="p-6 border-b border-base-200 dark:border-gray-700 bg-base-200/20">
                    <h3 className="text-xs font-bold text-base-content dark:text-white uppercase tracking-[0.2em]">Detailed Fiscal Audit Trail</h3>
                 </div>
                 <div className="overflow-x-auto">
                    <table id="financial-details-table" className="min-w-full divide-y divide-base-200 dark:divide-gray-700">
                        <thead className="bg-base-200/50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Project</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Item / Task</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Allocated</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Actual</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Variance</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Lifecycle</th>
                            </tr>
                        </thead>
                        <tbody className="bg-base-100 divide-y divide-base-200 dark:bg-gray-800 dark:divide-gray-700">
                            {filteredTasks.map(task => {
                                const act = task.completionDetails?.actualCost || 0;
                                const est = task.estimatedCost || 0;
                                const variance = est - act;
                                return (
                                <tr key={task.id} className="hover:bg-base-200/30 dark:hover:bg-gray-700/30 transition-all">
                                    <td className="px-6 py-4 text-xs font-bold text-gray-800 dark:text-gray-300">{task.projectName}</td>
                                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 font-medium">{task.name}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">{formatCurrency(est)}</td>
                                    <td className="px-6 py-4 text-xs text-gray-900 dark:text-white font-bold">{formatCurrency(act)}</td>
                                    <td className={`px-6 py-4 text-xs font-bold ${variance >= 0 ? 'text-green-600' : 'text-brand-tertiary'}`}>
                                        {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${task.status === TaskStatus.Completed ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400' : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                </tr>
                            )})}
                            {filteredTasks.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-20 text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Awaiting Data Matching...</td></tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

export default FinancialReportsTab;
