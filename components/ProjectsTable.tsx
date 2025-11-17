import React from 'react';
import { Project, ProjectStatus, Priority } from '../types';
import { DotsVerticalIcon, ArrowUpIcon, ArrowDownIcon } from './IconComponents';

export type SortKey = 'title' | 'status' | 'endDate' | 'priority' | 'completionPercentage' | 'totalCost';
export type SortDirection = 'ascending' | 'descending';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
    const colorMap: Record<ProjectStatus, string> = {
        [ProjectStatus.InProgress]: 'bg-blue-100 text-blue-800',
        [ProjectStatus.Completed]: 'bg-green-100 text-green-800',
        [ProjectStatus.OnHold]: 'bg-yellow-100 text-yellow-800',
        [ProjectStatus.NotStarted]: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[status]}`}>{status}</span>
};

const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
    const colorMap: Record<Priority, string> = {
        [Priority.High]: 'text-red-500',
        [Priority.Medium]: 'text-yellow-500',
        [Priority.Low]: 'text-green-500',
    };
    return <span className={`font-semibold ${colorMap[priority]}`}>{priority}</span>;
};

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
    <div className="w-full bg-base-200 rounded-full h-2.5">
        <div 
            className="bg-brand-primary h-2.5 rounded-full" 
            style={{ width: `${value}%` }}>
        </div>
    </div>
);

interface ProjectsTableProps {
    projects: Project[];
    onViewProject: (projectId: string) => void;
    sortConfig: { key: SortKey; direction: SortDirection } | null;
    requestSort: (key: SortKey) => void;
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
        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider ${className}`}>
            <button className="flex items-center gap-1" onClick={() => requestSort(sortKey)}>
                {title}
                {isSorted && (direction === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
            </button>
        </th>
    )
};


const ProjectsTable: React.FC<ProjectsTableProps> = ({ projects, onViewProject, sortConfig, requestSort }) => {
  return (
    <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto">
      <table className="min-w-full divide-y divide-base-300">
        <thead className="bg-base-200">
          <tr>
            <SortableHeader sortKey="title" title="Project Name" sortConfig={sortConfig} requestSort={requestSort} />
            <SortableHeader sortKey="status" title="Status" sortConfig={sortConfig} requestSort={requestSort} />
            <SortableHeader sortKey="endDate" title="Deadline" sortConfig={sortConfig} requestSort={requestSort} />
            <SortableHeader sortKey="priority" title="Priority" sortConfig={sortConfig} requestSort={requestSort} />
            <SortableHeader sortKey="completionPercentage" title="Progress" sortConfig={sortConfig} requestSort={requestSort} />
            <SortableHeader sortKey="totalCost" title="Total Cost" sortConfig={sortConfig} requestSort={requestSort} />
            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-base-100 divide-y divide-base-200">
          {projects.length > 0 ? projects.map(project => (
            <tr key={project.id} onClick={() => onViewProject(project.id)} className="hover:bg-base-200 transition-colors cursor-pointer">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-base-content">{project.title}</div>
                <div className="text-sm text-base-content-secondary truncate max-w-xs">{project.description}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={project.status} /></td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content">{new Date(project.endDate).toLocaleDateString()}</td>
              <td className="px-6 py-4 whitespace-nowrap"><PriorityBadge priority={project.priority} /></td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="w-24 mr-2"><ProgressBar value={project.completionPercentage} /></div>
                    <span className="text-sm text-base-content-secondary">{project.completionPercentage}%</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content font-medium">{formatCurrency(project.spent)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={(e) => {e.stopPropagation()}} className="text-gray-400 hover:text-brand-primary"><DotsVerticalIcon /></button>
              </td>
            </tr>
          )) : (
            <tr>
                <td colSpan={7} className="text-center py-10 text-base-content-secondary">No projects found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectsTable;