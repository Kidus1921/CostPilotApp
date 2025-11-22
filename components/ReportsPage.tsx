
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Project, Task, User, ExpenseCategory, ProjectStatus, UserRole } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { exportTableToExcel, exportElementAsPDF } from '../services/exportService';
import { FileExcelIcon, FilePdfIcon, ChevronDownIcon, XCircleIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon } from './IconComponents';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
const formatDate = (date: Date) => date.toISOString().split('T')[0];

type SortKey = 'projectName' | 'taskName' | 'assignedTo' | 'actualCost' | 'completedAt';
type SortDirection = 'ascending' | 'descending';

const KpiCard: React.FC<{ title: string; value: string; subtext?: string; colorClass?: string; }> = ({ title, value, subtext, colorClass = 'text-brand-primary' }) => (
    <div className="bg-base-100 dark:bg-gray-800 p-6 rounded-xl shadow-md transition-transform transform hover:scale-105">
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

const SortableHeader: React.FC<{
    sortKey: SortKey;
    title: string;
    currentSort: { key: SortKey; direction: SortDirection } | null;
    onSort: (key: SortKey) => void;
}> = ({ sortKey, title, currentSort, onSort }) => {
    const isSorted = currentSort?.key === sortKey;
    const direction = isSorted ? currentSort?.direction : null;

    return (
        <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors dark:text-gray-100 dark:hover:bg-gray-700 select-none"
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                {title}
                <span className="w-4 h-4 flex items-center justify-center">
                     {isSorted ? (
                        direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                    ) : (
                         <div className="opacity-0 group-hover:opacity-50"><ArrowDownIcon className="w-4 h-4" /></div>
                    )}
                </span>
            </div>
        </th>
    );
};

const ReportsPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Sort state
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

    // Privilege Check
    const canExport = currentUser.role === UserRole.Admin || (currentUser.privileges?.includes('can_export_reports') ?? false);

    useEffect(() => {
        let projectsLoaded = false;
        let usersLoaded = false;

        const checkLoading = () => {
            if (projectsLoaded && usersLoaded) {
                setLoading(false);
            }
        };

        const qProjects = query(collection(db, "projects"));
        const unsubscribeProjects = onSnapshot(qProjects, (querySnapshot) => {
            const projectsData: Project[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as Omit<Project, 'id' | 'spent'>;
                const spent = (data.tasks || []).reduce((sum, task) => sum + (task.completionDetails?.actualCost || 0), 0);
                projectsData.push({ id: doc.id, ...data, spent });
            });
            setProjects(projectsData);
            if (!projectsLoaded) {
                projectsLoaded = true;
                checkLoading();
            }
            setError(null);
        }, (err) => {
            console.error("Failed to fetch projects for reports:", err);
            setError("Could not load project data.");
            setLoading(false);
        });

        const qUsers = query(collection(db, "users"));
        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
            const usersData: User[] = [];
            snapshot.forEach(doc => usersData.push({id: doc.id, ...doc.data()} as User));
            setUsers(usersData);
            if (!usersLoaded) {
                usersLoaded = true;
                checkLoading();
            }
            setError(null);
        }, (err) => {
            console.error("Failed to fetch users for reports:", err);
            setError("Could not load user data.");
            setLoading(false);
        });

        return () => {
            unsubscribeProjects();
            unsubscribeUsers();
        };
    }, []);

    const filteredProjects = useMemo(() => {
        let projs = projects;
        if (selectedProjectIds.length > 0) {
            projs = projs.filter(p => selectedProjectIds.includes(p.id!));
        }
        if (selectedStatuses.length > 0) {
            projs = projs.filter(p => selectedStatuses.includes(p.status));
        }
        if (startDate) {
            projs = projs.filter(p => new Date(p.startDate) >= new Date(startDate));
        }
        if (endDate) {
            projs = projs.filter(p => new Date(p.endDate) <= new Date(endDate));
        }
        return projs;
    }, [projects, selectedProjectIds, selectedStatuses, startDate, endDate]);

    const filteredTasks = useMemo(() => {
        let tasks = filteredProjects.flatMap(p =>
            (p.tasks || []).map(t => ({ ...t, projectId: p.id!, projectName: p.title, projectBudget: p.budget }))
        );
        if (selectedUserIds.length > 0) {
            tasks = tasks.filter(t => t.assignedTo?.id && selectedUserIds.includes(t.assignedTo.id));
        }
        return tasks;
    }, [filteredProjects, selectedUserIds]);

    const sortedTasks = useMemo(() => {
        let tasks = [...filteredTasks];
        if (sortConfig) {
            tasks.sort((a, b) => {
                const key = sortConfig.key;
                let aValue: any = '';
                let bValue: any = '';

                switch (key) {
                    case 'projectName':
                        aValue = (a as any).projectName || '';
                        bValue = (b as any).projectName || '';
                        break;
                    case 'taskName':
                        aValue = a.name || '';
                        bValue = b.name || '';
                        break;
                    case 'assignedTo':
                        aValue = a.assignedTo?.name || '';
                        bValue = b.assignedTo?.name || '';
                        break;
                    case 'actualCost':
                        aValue = a.completionDetails?.actualCost || 0;
                        bValue = b.completionDetails?.actualCost || 0;
                        break;
                    case 'completedAt':
                        aValue = a.completionDetails?.completedAt ? new Date(a.completionDetails.completedAt).getTime() : 0;
                        bValue = b.completionDetails?.completedAt ? new Date(b.completionDetails.completedAt).getTime() : 0;
                        break;
                }

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return tasks;
    }, [filteredTasks, sortConfig]);

    const handleSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const reportData = useMemo(() => {
        const totalBudget = filteredProjects.reduce((sum, p) => sum + Number(p.budget || 0), 0);
        const totalActualCost = filteredProjects.reduce((sum, p) => sum + Number(p.spent || 0), 0);
        const variance = totalBudget - totalActualCost;
        const budgetUtilization = totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0;
        const activeProjects = filteredProjects.filter(p => p.status === ProjectStatus.InProgress).length;

        const categoryBreakdown = filteredTasks.reduce((acc, task) => {
            if (task.completionDetails) {
                const category = task.completionDetails.category || ExpenseCategory.Miscellaneous;
                acc[category] = (Number(acc[category]) || 0) + Number(task.completionDetails.actualCost);
            }
            return acc;
        }, {} as Record<string, number>);

        const spendingOverTime = filteredTasks
            .filter(t => t.completionDetails)
            .sort((a, b) => new Date(a.completionDetails!.completedAt).getTime() - new Date(b.completionDetails!.completedAt).getTime())
            .reduce((acc, task) => {
                const date = formatDate(new Date(task.completionDetails!.completedAt));
                const lastEntry = acc[acc.length - 1];
                const lastCost = lastEntry ? Number(lastEntry.cost) : 0;
                const currentCost = Number(task.completionDetails!.actualCost);
                const newCost = lastCost + currentCost;
                
                if (lastEntry && lastEntry.date === date) {
                    lastEntry.cost = newCost;
                } else {
                    acc.push({ date, cost: newCost });
                }
                return acc;
            }, [] as { date: string; cost: number }[]);
        
        const statusDistribution = filteredProjects.reduce((acc, project) => {
            const currentCount = acc[project.status] || 0;
            acc[project.status] = currentCount + 1;
            return acc;
        }, {} as Record<ProjectStatus, number>);
        
        const userContributions = filteredTasks.reduce((acc, task) => {
            if (task.completionDetails) {
                const userName = task.assignedTo.name;
                const currentTotal = acc[userName] || 0;
                const taskCost = Number(task.completionDetails.actualCost);
                acc[userName] = currentTotal + taskCost;
            }
            return acc;
        }, {} as Record<string, number>);

        return {
            totalBudget, totalActualCost, variance, budgetUtilization, activeProjects,
            categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
            spendingOverTime,
            statusDistribution: Object.entries(statusDistribution).map(([name, value]) => ({ name, value })),
            userContributions: Object.entries(userContributions).map(([name, value]) => ({ name, value: Number(value) })).sort((a,b) => b.value - a.value).slice(0, 5),
        };
    }, [filteredProjects, filteredTasks]);

    const clearFilters = () => {
        setSelectedProjectIds([]);
        setSelectedUserIds([]);
        setSelectedStatuses([]);
        setStartDate('');
        setEndDate('');
    };

    const CHART_COLORS = ['#65081b', '#f3c613', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B'];
    const STATUS_COLORS: { [key in ProjectStatus]?: string } = {
        [ProjectStatus.InProgress]: '#3B82F6', [ProjectStatus.Completed]: '#10B981', [ProjectStatus.OnHold]: '#f3c613', [ProjectStatus.Pending]: '#6B7280',
    };

    if (loading) return <div className="text-center p-10">Loading Reports...</div>;
    
    if (error) {
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                <h3 className="text-lg font-bold">An Error Occurred</h3>
                <p className="mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-base-content dark:text-gray-100">Analytics Dashboard</h2>
                {canExport && (
                    <div className="flex gap-2">
                        <button onClick={() => exportTableToExcel('detailed-report-table', 'detailed-report.xlsx')} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 flex items-center gap-2"><FileExcelIcon /> Excel</button>
                        <button onClick={() => exportElementAsPDF('report-export-area', 'analytics-dashboard.pdf')} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 flex items-center gap-2"><FilePdfIcon/> PDF</button>
                    </div>
                )}
            </div>

             {/* Filters */}
            <div className="bg-base-100 p-4 rounded-xl shadow-md dark:bg-gray-800">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4">
                     <MultiSelectDropdown title="Projects" options={projects.map(p => ({ value: p.id!, label: p.title }))} selectedValues={selectedProjectIds} onChange={setSelectedProjectIds} withSearch />
                     <MultiSelectDropdown title="Users" options={users.map(u => ({ value: u.id!, label: u.name }))} selectedValues={selectedUserIds} onChange={setSelectedUserIds} withSearch />
                     <MultiSelectDropdown title="Status" options={Object.values(ProjectStatus).map(s => ({ value: s, label: s }))} selectedValues={selectedStatuses} onChange={(v) => setSelectedStatuses(v as ProjectStatus[])} />
                    <div className="relative flex items-center gap-2 bg-base-200 dark:bg-gray-700/50 p-2 rounded-lg border border-transparent focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-colors">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent focus:outline-none text-sm text-base-content dark:text-gray-200 dark:[color-scheme:dark]"/>
                        <span className="text-sm text-base-content-secondary dark:text-gray-400">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent focus:outline-none text-sm text-base-content dark:text-gray-200 dark:[color-scheme:dark]"/>
                    </div>
                    <button onClick={clearFilters} className="flex items-center gap-2 text-sm font-semibold text-base-content-secondary hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-2 rounded-lg">
                        <XCircleIcon className="w-5 h-5" /> Clear Filters
                    </button>
                </div>
            </div>

            <div id="report-export-area">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KpiCard title="Total Budget" value={formatCurrency(reportData.totalBudget)} subtext={`${filteredProjects.length} projects selected`}/>
                    <KpiCard title="Total Spent" value={formatCurrency(reportData.totalActualCost)} subtext={`${filteredTasks.length} tasks included`}/>
                    <KpiCard title="Overall Variance" value={formatCurrency(reportData.variance)} colorClass={reportData.variance >= 0 ? 'text-green-500' : 'text-red-500'}/>
                    <KpiCard title="Active Projects" value={`${reportData.activeProjects}`} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                        <h3 className="text-lg font-bold dark:text-white">Spending Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={reportData.spendingOverTime} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                                <YAxis tickFormatter={(val) => `$${Number(val) / 1000}k`} tick={{ fill: '#9CA3AF' }}/>
                                <Tooltip wrapperClassName="dark:!bg-gray-700/80 dark:!border-gray-600" formatter={(value) => formatCurrency(Number(value))} />
                                <Area type="monotone" dataKey="cost" stroke="#65081b" fill="#65081b" fillOpacity={0.2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                     <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                        <h3 className="text-lg font-bold dark:text-white">Project Status</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={reportData.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                                    {reportData.statusDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as ProjectStatus]} />)}
                                </Pie>
                                <Legend iconType="circle" />
                                <Tooltip wrapperClassName="dark:!bg-gray-700/80 dark:!border-gray-600" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                     <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                        <h3 className="text-lg font-bold dark:text-white">Expense Breakdown</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reportData.categoryBreakdown} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis type="number" tickFormatter={(val) => formatCurrency(Number(val))} tick={{ fill: '#9CA3AF' }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', width: 80 }} />
                                <Tooltip wrapperClassName="dark:!bg-gray-700/80 dark:!border-gray-600" cursor={{fill: 'rgba(150,150,150,0.1)'}} formatter={(value) => formatCurrency(Number(value))}/>
                                <Bar dataKey="value" fill="#f3c613" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                        <h3 className="text-lg font-bold dark:text-white">Top 5 User Contributions</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reportData.userContributions} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                                <YAxis tickFormatter={(val) => formatCurrency(Number(val))} tick={{ fill: '#9CA3AF' }}/>
                                <Tooltip wrapperClassName="dark:!bg-gray-700/80 dark:!border-gray-600" cursor={{fill: 'rgba(150,150,150,0.1)'}} formatter={(value) => formatCurrency(Number(value))}/>
                                <Bar dataKey="value" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

             <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800 mt-6">
                 <h3 className="text-lg font-bold p-6 text-gray-900 dark:text-white">Detailed Report</h3>
                <table id="detailed-report-table" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700/50">
                        <tr>
                            <SortableHeader sortKey="projectName" title="Project" currentSort={sortConfig} onSort={handleSort} />
                            <SortableHeader sortKey="taskName" title="Task" currentSort={sortConfig} onSort={handleSort} />
                            <SortableHeader sortKey="assignedTo" title="Assigned To" currentSort={sortConfig} onSort={handleSort} />
                            <SortableHeader sortKey="actualCost" title="Actual Cost" currentSort={sortConfig} onSort={handleSort} />
                            <SortableHeader sortKey="completedAt" title="Completed On" currentSort={sortConfig} onSort={handleSort} />
                        </tr>
                    </thead>
                     <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {sortedTasks.map(task => (
                            <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">{(task as any).projectName}</td>
                                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{task.name}</td>
                                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{task.assignedTo.name}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(task.completionDetails?.actualCost || 0)}</td>
                                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{task.completionDetails ? formatDate(new Date(task.completionDetails.completedAt)) : 'N/A'}</td>
                            </tr>
                        ))}
                        {sortedTasks.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">No data matches the current filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReportsPage;
