import React, { useState, useMemo, useEffect, useRef } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Project, Task, ProjectStatus, ExpenseCategory, TaskStatus } from '../../types';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { exportTableToExcel, exportElementAsPDF } from '../../services/exportService';
import { FileExcelIcon, FilePdfIcon, ChevronDownIcon, XCircleIcon, SearchIcon } from '../IconComponents';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
const formatDate = (date: Date) => date.toISOString().split('T')[0];

const KpiCard: React.FC<{ title: string; value: string; subtext?: string; colorClass?: string; }> = ({ title, value, subtext, colorClass = 'text-brand-primary' }) => (
    <div className="bg-base-100 dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <p className="text-sm font-medium text-base-content-secondary uppercase dark:text-gray-400">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${colorClass} dark:text-teal-400`}>{value}</p>
        {subtext && <p className="text-xs text-base-content-secondary dark:text-gray-500 mt-1">{subtext}</p>}
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
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-48 bg-base-200 dark:bg-gray-700/50 p-2 rounded-lg text-sm font-semibold text-base-content dark:text-gray-200 hover:bg-base-300 dark:hover:bg-gray-600 transition-colors">
                {buttonText}
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-2 w-64 bg-base-100 dark:bg-gray-700 rounded-lg shadow-xl border border-base-300 dark:border-gray-600 z-10 p-2">
                    {withSearch && (
                        <div className="relative mb-2">
                             <SearchIcon className="absolute w-4 h-4 text-gray-400 top-1/2 left-3 transform -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-2 py-1.5 border border-base-300 rounded-md bg-base-200 focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                            />
                        </div>
                    )}
                    <div className="max-h-60 overflow-y-auto space-y-1">
                        {filteredOptions.map(option => (
                            <label key={option.value} className="flex items-center p-2 rounded-md hover:bg-base-200 dark:hover:bg-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(option.value)}
                                    onChange={() => handleSelect(option.value)}
                                    className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary border-gray-300 dark:bg-gray-800 dark:border-gray-500"
                                />
                                <span className="ml-3 text-sm text-base-content dark:text-gray-200">{option.label}</span>
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

    // Filter states
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const q = query(collection(db, "projects"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const projectsData: Project[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as Omit<Project, 'id' | 'spent'>;
                const spent = (data.tasks || []).reduce((sum, task) => sum + (task.completionDetails?.actualCost || 0), 0);
                projectsData.push({ id: doc.id, ...data, spent });
            });
            setProjects(projectsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredTasks = useMemo(() => {
        let tasks = projects.flatMap(p =>
            selectedProjectIds.length === 0 || selectedProjectIds.includes(p.id!)
                ? (p.tasks || []).map(t => ({ ...t, projectId: p.id!, projectName: p.title, projectBudget: p.budget }))
                : []
        );

        if (selectedStatuses.length > 0) {
            tasks = tasks.filter(t => selectedStatuses.includes(t.status));
        }

        if (startDate) {
            tasks = tasks.filter(t => t.completionDetails && new Date(t.completionDetails.completedAt) >= new Date(startDate));
        }
        if (endDate) {
            tasks = tasks.filter(t => t.completionDetails && new Date(t.completionDetails.completedAt) <= new Date(endDate));
        }

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

    const clearFilters = () => {
        setSelectedProjectIds([]);
        setSelectedStatuses([]);
        setStartDate('');
        setEndDate('');
    };

    const CATEGORY_COLORS = ['#0D9488', '#F97316', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B'];

    if (loading) return <div>Loading reports...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-base-content dark:text-gray-100">Advanced Financial Analytics</h2>
                <div className="flex gap-2">
                    <button onClick={() => exportTableToExcel('financial-details-table', 'financial-details.xlsx')} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 flex items-center gap-2"><FileExcelIcon /> Excel</button>
                    <button onClick={() => exportElementAsPDF('financial-report-export', 'financial-report.pdf')} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 flex items-center gap-2"><FilePdfIcon/> PDF</button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-base-100 p-4 rounded-xl shadow-md dark:bg-gray-800">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4">
                     <MultiSelectDropdown
                        title="Projects"
                        options={projects.map(p => ({ value: p.id!, label: p.title }))}
                        selectedValues={selectedProjectIds}
                        onChange={setSelectedProjectIds}
                        withSearch
                    />
                     <MultiSelectDropdown
                        title="Task Status"
                        options={Object.values(TaskStatus).map(s => ({ value: s, label: s }))}
                        selectedValues={selectedStatuses}
                        onChange={(vals) => setSelectedStatuses(vals as TaskStatus[])}
                    />
                    <div className="relative flex items-center gap-2 bg-base-200 dark:bg-gray-700/50 p-2 rounded-lg border border-transparent focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-colors">
                        <span className="text-sm text-base-content-secondary dark:text-gray-400 pl-1">From:</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent focus:outline-none text-sm text-base-content dark:text-gray-200 dark:[color-scheme:dark]"/>
                        <span className="text-sm text-base-content-secondary dark:text-gray-400">To:</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent focus:outline-none text-sm text-base-content dark:text-gray-200 dark:[color-scheme:dark]"/>
                    </div>
                    <button onClick={clearFilters} className="flex items-center gap-2 text-sm font-semibold text-base-content-secondary hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-2 rounded-lg">
                        <XCircleIcon className="w-5 h-5" /> Clear Filters
                    </button>
                </div>
            </div>

            <div id="financial-report-export">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KpiCard title="Total Budget" value={formatCurrency(reportData.totalBudget)} subtext={selectedProjectIds.length > 0 ? `${selectedProjectIds.length} projects selected` : 'All projects'}/>
                    <KpiCard title="Total Actual Cost" value={formatCurrency(reportData.totalActualCost)} subtext={`${filteredTasks.length} tasks included`}/>
                    <KpiCard title="Overall Variance" value={formatCurrency(reportData.variance)} colorClass={reportData.variance >= 0 ? 'text-green-500' : 'text-red-500'}/>
                    <KpiCard title="Budget Utilization" value={`${reportData.budgetUtilization.toFixed(1)}%`} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3 bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                        <h3 className="text-lg font-bold dark:text-white">Spending Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={reportData.spendingOverTime} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                                {/* FIX: Added explicit type 'any' to the 'val' parameter in tickFormatter to resolve TypeScript error. */}
                                <YAxis tickFormatter={(val: any) => `$${Number(val)/1000}k`} tick={{ fill: '#9CA3AF' }}/>
                                {/* FIX: Added explicit type 'number' to the 'value' parameter in formatter to resolve TypeScript error. */}
                                <Tooltip wrapperClassName="dark:!bg-gray-700/80 dark:!border-gray-600" formatter={(value: number) => formatCurrency(value as number)} />
                                <Area type="monotone" dataKey="cost" stroke="#0D9488" fill="#0D9488" fillOpacity={0.2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-2 bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                        <h3 className="text-lg font-bold dark:text-white">Expense Breakdown by Category</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={reportData.categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                                    {reportData.categoryBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
                                </Pie>
                                <Legend iconType="circle" />
                                {/* FIX: Added explicit type 'number' to the 'value' parameter in formatter to resolve TypeScript error. */}
                                <Tooltip wrapperClassName="dark:!bg-gray-700/80 dark:!border-gray-600" formatter={(value: number) => formatCurrency(value as number)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

             <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800">
                 <h3 className="text-lg font-bold p-6 dark:text-white">Detailed Report</h3>
                <table id="financial-details-table" className="min-w-full divide-y divide-base-300 dark:divide-gray-700">
                    <thead className="bg-base-200 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Project</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Task</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Est. Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Actual Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Variance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Status</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Completed On</th>
                        </tr>
                    </thead>
                     <tbody className="bg-base-100 divide-y divide-base-200 dark:bg-gray-800 dark:divide-gray-700">
                        {filteredTasks.map(task => {
                            const est = task.estimatedCost || 0;
                            const act = task.completionDetails?.actualCost || 0;
                            const variance = est - act;
                            return (
                            <tr key={task.id}>
                                <td className="px-6 py-4 font-medium dark:text-gray-200">{task.projectName}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{task.name}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{formatCurrency(est)}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{formatCurrency(act)}</td>
                                <td className={`px-6 py-4 font-semibold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(variance)}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{task.status}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{task.completionDetails ? formatDate(new Date(task.completionDetails.completedAt)) : 'N/A'}</td>
                            </tr>
                        )})}
                        {filteredTasks.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-500">No data matches the current filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinancialReportsTab;