import React, { useState, useEffect, useMemo, FC } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Project, ProjectStatus, Task, TaskStatus } from '../../types';
import { FileExcelIcon, FolderIcon, ArrowUpIcon, ArrowDownIcon } from '../IconComponents';
import { exportTableToExcel } from '../../services/exportService';

type SortKey = 'projectName' | 'name' | 'estimatedCost' | 'actualCost' | 'variance' | 'status';
type SortDirection = 'ascending' | 'descending';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const StatusBadge: FC<{ status: ProjectStatus | TaskStatus }> = ({ status }) => {
    const colorMap: Record<string, string> = {
        [ProjectStatus.OnHold]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [TaskStatus.Pending]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        [TaskStatus.InProgress]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
        [TaskStatus.Completed]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
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
        <th scope="col" className="px-6 py-4 font-semibold tracking-wider">
            <button className="flex items-center gap-1 uppercase" onClick={() => requestSort(sortKey)}>
                {title}
                {isSorted && (direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />)}
            </button>
        </th>
    )
};


const FinancialProjectsTab: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'projectName', direction: 'ascending' });

    const projectsCollectionRef = collection(db, 'projects');

    useEffect(() => {
        const q = query(projectsCollectionRef);
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const projectsData: Project[] = [];
            querySnapshot.forEach(doc => {
                projectsData.push({ ...doc.data(), id: doc.id } as Project);
            });
            setProjects(projectsData);
            setLoading(false);
        });

        return () => unsubscribe();
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

    const allTasksWithProjectName = useMemo(() => {
        return projects.flatMap(project =>
            (project.tasks || []).map(task => ({
                ...task,
                projectName: project.title
            }))
        );
    }, [projects]);

    const sortedTasks = useMemo(() => {
        let tasksToSort = [...(selectedProjectId === 'all'
            ? allTasksWithProjectName
            : selectedProject?.tasks || [])];

        if (sortConfig !== null) {
            tasksToSort.sort((a, b) => {
                const key = sortConfig.key;

                const getSortValue = (task: Task & {projectName?: string}) => {
                    switch (key) {
                        case 'projectName': return (task as any).projectName || '';
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

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return tasksToSort;
    }, [selectedProjectId, allTasksWithProjectName, selectedProject, sortConfig]);


    if (loading) return <div>Loading projects...</div>;

    const renderTable = (tasks: (Task & { projectName?: string })[], tableId: string, title: string) => (
         <div className="bg-base-100 p-6 sm:p-8 rounded-xl shadow-md dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-2xl font-bold text-base-content dark:text-white">{title}</h3>
                <button 
                    onClick={() => exportTableToExcel(tableId, `${title.replace(/ /g, '-')}.xlsx`)}
                    className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg shadow-sm hover:bg-green-700 flex items-center text-sm gap-2 transition-colors self-start sm:self-center">
                    <FileExcelIcon /> Export to Excel
                </button>
            </div>
            <div className="overflow-x-auto">
                <table id={tableId} className="w-full text-sm text-left">
                    <thead className="text-xs text-base-content-secondary bg-base-200 dark:bg-gray-700/50 dark:text-gray-400">
                        <tr>
                            {selectedProjectId === 'all' && <SortableHeader sortKey="projectName" title="Project" sortConfig={sortConfig} requestSort={requestSort} />}
                            <SortableHeader sortKey="name" title="Task Name" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="estimatedCost" title="Est. Cost" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="actualCost" title="Actual Cost" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="variance" title="Variance" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="status" title="Status" sortConfig={sortConfig} requestSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.length > 0 ? tasks.map(task => {
                            const actualCost = task.completionDetails?.actualCost || 0;
                            const estimatedCost = task.estimatedCost || 0;
                            const variance = estimatedCost - actualCost;
                            return (
                            <tr key={`${(task as any).projectName}-${task.id}`} className="border-b border-base-200 dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-700/50 hover:bg-teal-50 dark:hover:bg-gray-700 transition-colors">
                                {selectedProjectId === 'all' && <td className="px-6 py-4 align-middle font-semibold text-base-content dark:text-gray-100">{(task as any).projectName}</td>}
                                <td className="px-6 py-4 align-middle text-base-content dark:text-gray-200">{task.name}</td>
                                <td className="px-6 py-4 align-middle text-base-content-secondary dark:text-gray-300">{formatCurrency(estimatedCost)}</td>
                                <td className="px-6 py-4 align-middle text-base-content-secondary dark:text-gray-300">{formatCurrency(actualCost)}</td>
                                <td className={`px-6 py-4 align-middle font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(variance)}</td>
                                <td className="px-6 py-4 align-middle"><StatusBadge status={task.status} /></td>
                            </tr>
                        )}) : (
                             <tr>
                                <td colSpan={selectedProjectId === 'all' ? 6 : 5} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                        <FolderIcon className="w-12 h-12 mb-2 text-gray-400"/>
                                        <p className="font-semibold text-lg">No Tasks Found</p>
                                        <p className="text-sm">There are no tasks to display for the selected scope.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                <div className="flex flex-wrap items-center gap-4">
                    <label htmlFor="project-filter" className="text-lg font-semibold text-base-content dark:text-gray-200">
                        View Project:
                    </label>
                    <select 
                        id="project-filter" 
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full max-w-sm px-4 py-3 border border-gray-300 rounded-lg bg-base-100 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Projects (Portfolio View)</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {renderTable(sortedTasks, selectedProjectId === 'all' ? 'all-tasks-report-table' : 'project-tasks-table', selectedProjectId === 'all' ? 'Portfolio Task Overview' : `Task Report: ${selectedProject?.title || ''}`)}
        </div>
    );
};

export default FinancialProjectsTab;