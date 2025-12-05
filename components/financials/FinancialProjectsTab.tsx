
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
        'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Pending': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full items-center ${colorMap[status]}`}>{status}</span>;
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
        <th scope="col" className="px-6 py-4 font-semibold tracking-wider cursor-pointer hover:bg-base-300 dark:hover:bg-gray-600 transition-colors" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center gap-1 uppercase">
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

    // Logic for sorting Projects (when All is selected)
    const sortedProjects = useMemo(() => {
        let projs = [...projects];
        if (sortConfig) {
            projs.sort((a, b) => {
                const key = sortConfig.key;
                const getSortValue = (p: Project) => {
                    switch(key) {
                        case 'projectName': return p.title;
                        case 'budget': return p.budget;
                        case 'spent': return p.spent;
                        case 'variance': return p.budget - p.spent;
                        case 'status': return p.status;
                        default: return '';
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

    // Logic for sorting Tasks (when a Specific Project is selected)
    const sortedTasks = useMemo(() => {
        if (!selectedProject) return [];
        let tasks = [...(selectedProject.tasks || [])];

        if (sortConfig) {
            tasks.sort((a, b) => {
                const key = sortConfig.key;
                const getSortValue = (task: Task) => {
                    switch (key) {
                        case 'name': return task.name;
                        case 'status': return task.status;
                        case 'estimatedCost': return task.estimatedCost || 0;
                        case 'actualCost': return task.completionDetails?.actualCost || 0;
                        case 'variance': return (task.estimatedCost || 0) - (task.completionDetails?.actualCost || 0);
                        default: return '';
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


    if (loading) return <div>Loading projects...</div>;

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
            <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                <div className="flex flex-wrap items-center gap-4">
                    <label htmlFor="project-filter" className="text-lg font-semibold text-base-content dark:text-gray-200">
                        View Scope:
                    </label>
                    <select 
                        id="project-filter" 
                        value={selectedProjectId}
                        onChange={(e) => {
                            setSelectedProjectId(e.target.value);
                            // Reset sort when switching views to avoid confusing states
                            setSortConfig(e.target.value === 'all' ? { key: 'projectName', direction: 'ascending' } : { key: 'name', direction: 'ascending' });
                        }}
                        className="w-full max-w-sm px-4 py-3 border border-gray-300 rounded-lg bg-base-100 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Projects (Portfolio Budget)</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedProjectId === 'all' ? (
                // PROJECT LEVEL TABLE
                <div className="bg-base-100 p-6 sm:p-8 rounded-xl shadow-md dark:bg-gray-800">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                        <h3 className="text-2xl font-bold text-base-content dark:text-white">Portfolio Financial Report</h3>
                        <button 
                            onClick={() => exportTableToExcel('project-financials-table', 'portfolio-report.xlsx')}
                            className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg shadow-sm hover:bg-green-700 flex items-center text-sm gap-2 transition-colors self-start sm:self-center">
                            <FileExcelIcon /> Export to Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table id="project-financials-table" className="w-full text-sm text-left">
                            <thead className="text-xs text-base-content-secondary bg-base-200 dark:bg-gray-700/50 dark:text-gray-400">
                                <tr>
                                    <SortableHeader sortKey="projectName" title="Project Name" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="budget" title="Budget (Est.)" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="spent" title="Actual Spent" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="variance" title="Variance" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="status" title="Status" sortConfig={sortConfig} requestSort={requestSort} />
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProjects.length > 0 ? sortedProjects.map(project => {
                                    const variance = project.budget - project.spent;
                                    return (
                                        <tr key={project.id} className="border-b border-base-200 dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-700/50 hover:bg-teal-50 dark:hover:bg-gray-700 transition-colors cursor-pointer" onClick={() => setSelectedProjectId(project.id!)}>
                                            <td className="px-6 py-4 align-middle font-semibold text-base-content dark:text-gray-100">{project.title}</td>
                                            <td className="px-6 py-4 align-middle text-base-content dark:text-gray-200">{formatCurrency(project.budget)}</td>
                                            <td className="px-6 py-4 align-middle text-base-content dark:text-gray-200">{formatCurrency(project.spent)}</td>
                                            <td className={`px-6 py-4 align-middle font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(variance)}</td>
                                            <td className="px-6 py-4 align-middle"><StatusBadge status={project.status} /></td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16 text-gray-500 dark:text-gray-400">
                                            No projects found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // TASK LEVEL TABLE
                <div className="bg-base-100 p-6 sm:p-8 rounded-xl shadow-md dark:bg-gray-800">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                        <h3 className="text-2xl font-bold text-base-content dark:text-white">Detailed Task Report: {selectedProject?.title}</h3>
                        <button 
                            onClick={() => exportTableToExcel('task-financials-table', `tasks-${selectedProject?.title.replace(/\s+/g, '-')}.xlsx`)}
                            className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg shadow-sm hover:bg-green-700 flex items-center text-sm gap-2 transition-colors self-start sm:self-center">
                            <FileExcelIcon /> Export to Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table id="task-financials-table" className="w-full text-sm text-left">
                            <thead className="text-xs text-base-content-secondary bg-base-200 dark:bg-gray-700/50 dark:text-gray-400">
                                <tr>
                                    <SortableHeader sortKey="name" title="Task Name" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="estimatedCost" title="Est. Cost" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="actualCost" title="Actual Cost" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="variance" title="Variance" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="status" title="Status" sortConfig={sortConfig} requestSort={requestSort} />
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTasks.length > 0 ? sortedTasks.map(task => {
                                    const actualCost = task.completionDetails?.actualCost || 0;
                                    const estimatedCost = task.estimatedCost || 0;
                                    const variance = estimatedCost - actualCost;
                                    return (
                                    <tr key={task.id} className="border-b border-base-200 dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-700/50 hover:bg-teal-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 align-middle text-base-content dark:text-gray-200">{task.name}</td>
                                        <td className="px-6 py-4 align-middle text-base-content-secondary dark:text-gray-300">{formatCurrency(estimatedCost)}</td>
                                        <td className="px-6 py-4 align-middle text-base-content-secondary dark:text-gray-300">{formatCurrency(actualCost)}</td>
                                        <td className={`px-6 py-4 align-middle font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(variance)}</td>
                                        <td className="px-6 py-4 align-middle"><StatusBadge status={task.status} /></td>
                                    </tr>
                                )}) : (
                                     <tr>
                                        <td colSpan={5} className="text-center py-16">
                                            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                                <FolderIcon className="w-12 h-12 mb-2 text-gray-400"/>
                                                <p className="font-semibold text-lg">No Tasks Found</p>
                                                <p className="text-sm">There are no tasks to display for this project.</p>
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