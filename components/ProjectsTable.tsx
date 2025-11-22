
import React from 'react';
import { Project, ProjectStatus, User, UserRole } from '../types';
import { DotsVerticalIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon } from './IconComponents';

export type SortKey = 'title' | 'status' | 'endDate' | 'completionPercentage' | 'totalCost';
export type SortDirection = 'ascending' | 'descending';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
    const colorMap: Record<ProjectStatus, string> = {
        [ProjectStatus.InProgress]: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
        [ProjectStatus.Completed]: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
        [ProjectStatus.OnHold]: 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
        [ProjectStatus.Pending]: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
    };
    return <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${colorMap[status]}`}>{status}</span>
};

interface ProjectsTableProps {
    projects: Project[];
    onViewProject: (projectId: string) => void;
    sortConfig: { key: SortKey; direction: SortDirection } | null;
    requestSort: (key: SortKey) => void;
    currentUser?: User;
    canDelete?: boolean;
    onDeleteProject?: (project: Project) => void;
}

const SortableHeader: React.FC<{
    sortKey: SortKey;
    title: string;
    sortConfig: ProjectsTableProps['sortConfig'];
    requestSort: ProjectsTableProps['requestSort'];
    className?: string;
}> = ({ sortKey, title, sortConfig, requestSort, className = "" }) => {
    const isSorted = sortConfig?.key === sortKey;
    const direction = isSorted ? sortConfig?.direction : null;

    return (
        <th scope="col" className={`px-6 py-3 text-left text-xs font-bold text-base-content-secondary uppercase tracking-wider dark:text-gray-400 ${className}`}>
            <button className="flex items-center gap-1 hover:text-brand-primary transition-colors" onClick={() => requestSort(sortKey)}>
                {title}
                {isSorted && (direction === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
            </button>
        </th>
    )
};

const ProjectsTable: React.FC<ProjectsTableProps> = ({ projects, onViewProject, sortConfig, requestSort, currentUser, canDelete, onDeleteProject }) => {
  
    // Function to calculate row background based on progress using CSS variables for theme adaptability
    const getRowBackgroundStyle = (project: Project) => {
        const percentage = project.completionPercentage;
        
        if (project.status === ProjectStatus.Completed) {
            return {}; // Handled by class name (green background)
        }

        // Using rgb(var(--color-brand-primary) / 0.1) allows the brand color to be used with 10% opacity
        // This acts as a subtle progress bar filling the row
        return {
            backgroundImage: `linear-gradient(90deg, rgb(var(--color-brand-primary) / 0.1) ${percentage}%, transparent ${percentage}%)`
        };
    };

    return (
        <div className="bg-base-100 rounded-xl shadow-md overflow-hidden dark:bg-gray-800 border border-base-200 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-base-300 dark:divide-gray-700">
                    <thead className="bg-base-200 dark:bg-gray-700/50">
                        <tr>
                            <SortableHeader sortKey="title" title="Project Name" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="status" title="Status" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="endDate" title="Deadline" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="completionPercentage" title="Progress" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="totalCost" title="Total Cost" sortConfig={sortConfig} requestSort={requestSort} />
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-base-100 divide-y divide-base-200 dark:bg-gray-800 dark:divide-gray-700">
                        {projects.length > 0 ? projects.map(project => {
                            const isCompleted = project.status === ProjectStatus.Completed;
                            const rowClass = isCompleted 
                                ? 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/30';

                            return (
                                <tr 
                                    key={project.id} 
                                    onClick={() => onViewProject(project.id!)} 
                                    className={`transition-all duration-200 cursor-pointer group ${rowClass}`}
                                    style={!isCompleted ? getRowBackgroundStyle(project) : undefined}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap relative">
                                        <div className="text-sm font-bold text-base-content dark:text-gray-100 group-hover:text-brand-primary transition-colors">{project.title}</div>
                                        <div className="text-xs text-base-content-secondary truncate max-w-xs dark:text-gray-400">{project.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap relative">
                                        <StatusBadge status={project.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base-content dark:text-gray-300 relative">
                                        {new Date(project.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap relative">
                                        <div className="flex items-center">
                                            <span className={`text-sm font-bold ${project.completionPercentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-base-content-secondary dark:text-gray-400'}`}>
                                                {project.completionPercentage}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content font-medium dark:text-gray-200 relative">
                                        {formatCurrency(project.spent)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative z-10">
                                        {canDelete && onDeleteProject && (
                                            <button 
                                                onClick={(e) => {e.stopPropagation(); onDeleteProject(project);}} 
                                                className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                title="Delete Project"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-base-content-secondary dark:text-gray-400">No projects found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProjectsTable;
