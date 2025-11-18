import React from 'react';
import { Project, ProjectStatus } from '../types';
import { DotsVerticalIcon, ArrowUpIcon, ArrowDownIcon } from './IconComponents';

export type SortKey = 'title' | 'status' | 'endDate' | 'completionPercentage' | 'totalCost';
export type SortDirection = 'ascending' | 'descending';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
    const colorMap: Record<ProjectStatus, string> = {
        [ProjectStatus.InProgress]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [ProjectStatus.Completed]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [ProjectStatus.OnHold]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [ProjectStatus.Pending]: 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[status]}`}>{status}</span>
};

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
    <div className="w-full bg-base-200 rounded-full h-2.5 dark:bg-gray-700">
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
        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400 ${className}`}>
            <button className="flex items-center gap-1" onClick={() => requestSort(sortKey)}>
                {title}
                {isSorted && (direction === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
            </button>
        </th>
    )
};


const ProjectsTable: React.FC<ProjectsTableProps> = ({ projects, onViewProject, sortConfig, requestSort }) => {
  return (
    <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800">
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
          {projects.length > 0 ? projects.map(project => (
            <tr key={project.id} onClick={() => onViewProject(project.id!)} className="hover:bg-base-200 transition-colors cursor-pointer dark:hover:bg-gray-700/50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-base-content dark:text-gray-100">{project.title}</div>
                <div className="text-sm text-base-content-secondary truncate max-w-xs dark:text-gray-400">{project.description}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={project.status} /></td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content dark:text-gray-300">{new Date(project.endDate).toLocaleDateString()}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="w-24 mr-2"><ProgressBar value={project.completionPercentage} /></div>
                    <span className="text-sm text-base-content-secondary dark:text-gray-400">{project.completionPercentage}%</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content font-medium dark:text-gray-200">{formatCurrency(project.spent)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={(e) => {e.stopPropagation()}} className="text-gray-400 hover:text-brand-primary dark:text-gray-500 dark:hover:text-teal-500"><DotsVerticalIcon /></button>
              </td>
            </tr>
          )) : (
            <tr>
                <td colSpan={6} className="text-center py-10 text-base-content-secondary dark:text-gray-400">No projects found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectsTable;