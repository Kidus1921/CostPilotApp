import React, { useState, useEffect, useMemo, FC } from 'react';
import { supabase } from '../../supabaseClient';
import { Project, ProjectStatus, Task, TaskStatus } from '../../types';
import { FileExcelIcon, FolderIcon, ArrowUpIcon, ArrowDownIcon } from '../IconComponents';
import { exportTableToExcel } from '../../services/exportService';

type SortKey = 'projectName' | 'name' | 'estimatedCost' | 'actualCost' | 'variance' | 'status' | 'budget' | 'spent';
type SortDirection = 'ascending' | 'descending';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const StatusBadge: FC<{ status: ProjectStatus | TaskStatus }> = ({ status }) => {
    const colorMap: Record<string, string> = {
        [ProjectStatus.InProgress]: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20',
        [ProjectStatus.Completed]: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300',
        [ProjectStatus.OnHold]: 'bg-brand-secondary/20 text-brand-primary border border-brand-secondary/30',
        [ProjectStatus.Pending]: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-200',
        [ProjectStatus.Rejected]: 'bg-brand-tertiary/10 text-brand-tertiary border border-brand-tertiary/20',
    };
    return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${colorMap[status] || 'bg-gray-100'}`}>{status}</span>
};

const SortableHeader: FC<{
    sortKey: SortKey;
    title: string;
    sortConfig: { key: SortKey; direction: SortDirection } | null;
    requestSort: (key: SortKey) => void;
}> = ({ sortKey, title, sortConfig, requestSort }) => {
    const isSorted = sortConfig?.key === sortKey;
    const direction = isSorted ? sortConfig?.direction : null;

    return (
        <th scope="col" className="px-4 py-3 font-bold tracking-wider cursor-pointer hover:bg-base-300 dark:hover:bg-gray-600 transition-colors whitespace-nowrap" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center gap-1 uppercase text-xs">
                {title}
                {isSorted && (direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />)}
            </div>
        </th>
    )
};


const FinancialProjectsTab: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'projectName', direction: 'ascending' });

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase.from('projects').select('*');
            if (error) {
                console.error("Financial projects fetch error:", error);
                setError("Could not load financial project data.");
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

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const selectedProject = useMemo(() => {
        if (selectedProjectId === 'all') return null;
        return projects.find(p => p.id === selectedProjectId);
    }, [projects, selectedProjectId]);

    const sortedProjects = useMemo(() => {
        let projs = [...projects];
        if (sortConfig) {
            projs.sort((a, b) => {
                const key = sortConfig.key;
                const getSortValue = (p: Project) => {
                    switch(key) {
                        case 'projectName': return p.title || '';
                        case 'budget': return p.budget || 0;
                        case 'spent': return p.spent || 0;
                        case 'variance': return (p.budget || 0) - (p.spent || 0);
                        case 'status': return p.status || '';
                        default: return 0;
                    }
                };
                const aValue = getSortValue(a);
                const bValue = getSortValue(b);
                
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return projs;
    }, [projects, sortConfig]);

    const sortedTasks = useMemo(() => {
        if (!selectedProject) return [];
        let tasks = [...(selectedProject.tasks || [])];

        if (sortConfig) {
            tasks.sort((a, b) => {
                const key = sortConfig.key;
                const getSortValue = (task: Task) => {
                    switch (key) {
                        case 'name': return task.name || '';
                        case 'status': return task.status || '';
                        case 'estimatedCost': return task.estimatedCost || 0;
                        case 'actualCost': return task.completionDetails?.actualCost || 0;
                        case 'variance': return (task.estimatedCost || 0) - (task.completionDetails?.actualCost || 0);
                        default: return 0;
                    }
                };

                const aValue = getSortValue(a);
                const bValue = getSortValue(b);

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return tasks;
    }, [selectedProject, sortConfig]);


    if (loading) return <div className="p-4 text-center">Loading projects...</div>;

    if (error) {
        return (
            <div className="p-4 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                <h3 className="text-lg font-bold">An Error Occurred</h3>
                <p className="mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 dark:bg-[#111111] dark:border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label htmlFor="project-filter" className="text-sm font-bold uppercase tracking-widest text-gray-500">
                        View Scope:
                    </label>
                    <select 
                        id="project-filter" 
                        value={selectedProjectId}
                        onChange={(e) => {
                            setSelectedProjectId(e.target.value);
                            setSortConfig(e.target.value === 'all' ? { key: 'projectName', direction: 'ascending' } : { key: 'name', direction: 'ascending' });
                        }}
                        className="w-full sm:max-w-sm px-4 py-2.5 border border-base-300 rounded-xl bg-base-100 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Projects (Portfolio Budget)</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedProjectId === 'all' ? (
                <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 dark:bg-[#111111] dark:border-white/10">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                        <h3 className="text-xl font-bold text-base-content dark:text-white uppercase tracking-wider">Portfolio Fiscal Audit</h3>
                        <button 
                            onClick={() => exportTableToExcel('project-financials-table', 'portfolio-report.xlsx')}
                            className="bg-green-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:bg-green-700 flex items-center text-sm gap-2 transition-all self-start w-full sm:w-auto justify-center">
                            <FileExcelIcon /> Export to Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table id="project-financials-table" className="min-w-full text-sm text-left">
                            <thead className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-base-200 dark:bg-gray-700/50">
                                <tr>
                                    <SortableHeader sortKey="projectName" title="Project Name" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="budget" title="Budget (Est.)" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="spent" title="Actual Spent" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="variance" title="Variance" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="status" title="Status" sortConfig={sortConfig} requestSort={requestSort} />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base-200 dark:divide-gray-700">
                                {sortedProjects.length > 0 ? sortedProjects.map(project => {
                                    const budget = project.budget || 0;
                                    const spent = project.spent || 0;
                                    const variance = budget - spent;
                                    return (
                                        <tr key={project.id} className="group hover:bg-base-200/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => setSelectedProjectId(project.id!)}>
                                            <td className="px-4 py-4 whitespace-nowrap align-middle font-bold text-base-content dark:text-gray-100 group-hover:text-brand-primary">{project.title}</td>
                                            <td className="px-4 py-4 whitespace-nowrap align-middle text-gray-500 dark:text-gray-400">{formatCurrency(budget)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap align-middle font-bold text-base-content dark:text-gray-200">{formatCurrency(spent)}</td>
                                            <td className={`px-4 py-4 whitespace-nowrap align-middle font-bold ${variance >= 0 ? 'text-green-600' : 'text-brand-tertiary'}`}>{formatCurrency(variance)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap align-middle"><StatusBadge status={project.status} /></td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                                            No projects found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 dark:bg-[#111111] dark:border-white/10">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                        <h3 className="text-xl font-bold text-base-content dark:text-white uppercase tracking-wider">Detailed Task Audit: {selectedProject?.title}</h3>
                        <button 
                            onClick={() => exportTableToExcel('task-financials-table', `tasks-${selectedProject?.title.replace(/\s+/g, '-')}.xlsx`)}
                            className="bg-green-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:bg-green-700 flex items-center text-sm gap-2 transition-all self-start w-full sm:w-auto justify-center">
                            <FileExcelIcon /> Export to Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table id="task-financials-table" className="min-w-full text-sm text-left">
                            <thead className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-base-200 dark:bg-gray-700/50">
                                <tr>
                                    <SortableHeader sortKey="name" title="Task Name" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="estimatedCost" title="Est. Cost" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="actualCost" title="Actual Cost" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="variance" title="Variance" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="status" title="Status" sortConfig={sortConfig} requestSort={requestSort} />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base-200 dark:divide-gray-700">
                                {sortedTasks.length > 0 ? sortedTasks.map(task => {
                                    const actualCost = task.completionDetails?.actualCost || 0;
                                    const estimatedCost = task.estimatedCost || 0;
                                    const variance = estimatedCost - actualCost;
                                    return (
                                    <tr key={task.id} className="hover:bg-base-200/50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap align-middle font-bold text-base-content dark:text-gray-100">{task.name}</td>
                                        <td className="px-4 py-4 whitespace-nowrap align-middle text-gray-500 dark:text-gray-400">{formatCurrency(estimatedCost)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap align-middle font-bold text-base-content dark:text-gray-200">{formatCurrency(actualCost)}</td>
                                        <td className={`px-4 py-4 whitespace-nowrap align-middle font-bold ${variance >= 0 ? 'text-green-600' : 'text-brand-tertiary'}`}>{formatCurrency(variance)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap align-middle"><StatusBadge status={task.status} /></td>
                                    </tr>
                                )}) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10">
                                            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                                <FolderIcon className="w-10 h-10 mb-2 text-gray-400"/>
                                                <p className="font-bold uppercase tracking-widest text-xs">No Tasks Found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialProjectsTab;