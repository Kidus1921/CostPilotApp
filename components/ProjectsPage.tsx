import React, { useState, useMemo, FC, useCallback } from 'react';
import { Project, ProjectStatus, Priority, User, Task, TaskStatus, ExpenseCategory } from '../types';
import ProjectsTable, { SortKey } from './ProjectsTable';
import CreateProjectModal, { NewProjectData } from './CreateProjectModal';
import CreateTaskModal, { NewTaskData } from './CreateTaskModal';
import { SearchIcon, ArrowLeftIcon, PlusIcon, DotsVerticalIcon } from './IconComponents';

// ===================================================================================
// MOCK DATA (Centralized)
// ===================================================================================
export const mockUsers: User[] = [
    { id: 'u1', name: 'Alice Johnson', avatarUrl: 'https://i.pravatar.cc/150?u=u1' },
    { id: 'u2', name: 'Bob Williams', avatarUrl: 'https://i.pravatar.cc/150?u=u2' },
    { id: 'u3', name: 'Charlie Brown', avatarUrl: 'https://i.pravatar.cc/150?u=u3' },
    { id: 'u4', name: 'Diana Prince', avatarUrl: 'https://i.pravatar.cc/150?u=u4' },
];

const project1Tasks: Task[] = [
    { id: 't1-1', name: 'Design Database Schema', description: 'Plan and design the main database schema.', assignedTo: mockUsers[1], priority: Priority.High, deadline: '2024-07-15', status: TaskStatus.Completed, estimatedCost: 1500, completionDetails: { description: 'DB schema finalized and reviewed.', category: ExpenseCategory.Labor, actualCost: 1400, completedAt: '2024-06-20' } },
    { id: 't1-2', name: 'Develop API Endpoints', description: 'Create RESTful APIs for core functionalities.', assignedTo: mockUsers[2], priority: Priority.High, deadline: '2024-07-25', status: TaskStatus.InProgress, estimatedCost: 3000 },
    { id: 't1-3', name: 'Implement User Authentication', description: 'Set up JWT-based authentication.', assignedTo: mockUsers[2], priority: Priority.High, deadline: '2024-07-28', status: TaskStatus.Pending, estimatedCost: 2000 },
    { id: 't1-4', name: 'Build Frontend Dashboard', description: 'Develop the main dashboard UI.', assignedTo: mockUsers[3], priority: Priority.Medium, deadline: '2024-08-10', status: TaskStatus.Pending, estimatedCost: 4000 },
];
const project2Tasks: Task[] = [
    { id: 't2-1', name: 'Market Research', description: 'Analyze competitors and target audience.', assignedTo: mockUsers[0], priority: Priority.High, status: TaskStatus.Completed, completionDetails: { description: 'Analysis complete', category: ExpenseCategory.Labor, actualCost: 2000, completedAt: '2024-05-10'} },
    { id: 't2-2', name: 'UI/UX Wireframing', description: 'Create wireframes for all main pages.', assignedTo: mockUsers[3], priority: Priority.High, status: TaskStatus.InProgress },
];

export const mockProjects: Project[] = [
    { id: 'p1', title: 'Quantum CRM Development', description: 'Next-gen customer relationship management platform.', startDate: '2023-01-15', endDate: '2024-07-30', priority: Priority.High, teamLeader: mockUsers[0], team: mockUsers.slice(0, 3), tags: ['CRM', 'SaaS', 'React'], status: ProjectStatus.InProgress, completionPercentage: 25, budget: 150000, spent: 1400, tasks: project1Tasks, expenses: [] },
    { id: 'p2', title: 'E-commerce Platform Overhaul', description: 'Complete redesign and migration of the existing online store.', startDate: '2023-03-01', endDate: '2024-08-15', priority: Priority.High, teamLeader: mockUsers[1], team: [mockUsers[1], mockUsers[3]], tags: ['E-commerce', 'Migration'], status: ProjectStatus.InProgress, completionPercentage: 50, budget: 250000, spent: 2000, tasks: project2Tasks, expenses: [] },
    { id: 'p3', title: 'Mobile App "ConnectU"', description: 'A new social networking app for professionals.', startDate: '2023-06-10', endDate: '2024-12-20', priority: Priority.Medium, teamLeader: mockUsers[2], team: [mockUsers[2], mockUsers[0]], status: ProjectStatus.NotStarted, completionPercentage: 0, budget: 80000, spent: 0, tasks: [], expenses: [] },
    { id: 'p4', title: 'Data Center Migration', description: 'Migrating all servers to a new cloud infrastructure.', startDate: '2022-11-01', endDate: '2024-05-20', priority: Priority.High, teamLeader: mockUsers[0], team: mockUsers.slice(0,2), status: ProjectStatus.Completed, completionPercentage: 100, budget: 300000, spent: 285000, tasks: [], expenses: [] },
    { id: 'p5', title: 'Internal HR Portal', description: 'A new portal for employee management.', startDate: '2023-09-01', endDate: '2024-09-30', priority: Priority.Low, teamLeader: mockUsers[1], team: [mockUsers[1]], status: ProjectStatus.OnHold, completionPercentage: 0, budget: 45000, spent: 0, tasks: [], expenses: [] },
];

export const mockActivities = [
    { id: 'a1', type: 'project', description: 'created a new project "Quantum CRM Development"', timestamp: '2 hours ago', user: mockUsers[0] },
    { id: 'a2', type: 'finance', description: 'added a $1,400 expense for "Design Database Schema"', timestamp: '5 hours ago', user: mockUsers[1] },
    { id: 'a3', type: 'task', description: 'completed task "Market Research" on "E-commerce Overhaul"', timestamp: '1 day ago', user: mockUsers[0] },
];

// ===================================================================================
// HELPER COMPONENTS & UTILS
// ===================================================================================
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const priorityMap: Record<Priority, number> = {
    [Priority.High]: 1,
    [Priority.Medium]: 2,
    [Priority.Low]: 3,
};

const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
    const colorMap: Record<Priority, string> = { [Priority.High]: 'text-red-500', [Priority.Medium]: 'text-yellow-500', [Priority.Low]: 'text-green-500' };
    return <span className={`font-semibold ${colorMap[priority]}`}>{priority}</span>;
};
// FIX: Removed duplicate keys from colorMap. ProjectStatus and TaskStatus have overlapping member values (e.g., 'In Progress').
const StatusBadge: React.FC<{ status: ProjectStatus | TaskStatus }> = ({ status }) => {
    const colorMap: Record<string, string> = {
        [ProjectStatus.InProgress]: 'bg-blue-100 text-blue-800', [ProjectStatus.Completed]: 'bg-green-100 text-green-800', [ProjectStatus.OnHold]: 'bg-yellow-100 text-yellow-800', [ProjectStatus.NotStarted]: 'bg-gray-100 text-gray-800',
        [TaskStatus.Pending]: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[status]}`}>{status}</span>
};

// ===================================================================================
// TASK COMPLETION MODAL
// ===================================================================================
const TaskCompletionModal: FC<{ task: Task; isOpen: boolean; onClose: () => void; onConfirm: (details: any) => void; }> = ({ task, isOpen, onClose, onConfirm }) => {
    const [actualCost, setActualCost] = useState(task.estimatedCost || 0);
    const [category, setCategory] = useState(ExpenseCategory.Miscellaneous);
    const [description, setDescription] = useState('');
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({ actualCost, category, description });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Complete Task: {task.name}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="actualCost" className="block text-sm font-medium text-base-content-secondary">Actual Cost Spent ($)</label>
                        <input type="number" id="actualCost" value={actualCost} onChange={e => setActualCost(Number(e.target.value))} required className="mt-1 block w-full px-3 py-2 bg-base-100 text-base-content border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary" />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-base-content-secondary">Category</label>
                        <select id="category" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} required className="mt-1 block w-full pl-3 pr-10 py-2 bg-base-100 text-base-content border-base-300 focus:outline-none focus:ring-brand-primary rounded-md">
                            {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="comp-description" className="block text-sm font-medium text-base-content-secondary">Completion Description</label>
                        <textarea id="comp-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} required className="mt-1 block w-full px-3 py-2 bg-base-100 text-base-content border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content font-bold py-2 px-4 rounded-lg hover:bg-base-300">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">Confirm Completion</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// ===================================================================================
// TASK LIST COMPONENT
// ===================================================================================
const TaskList: FC<{ project: Project; onUpdateTask: (updatedTask: Task) => void; onAddTask: () => void; }> = ({ project, onUpdateTask, onAddTask }) => {
    const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);

    const handleCheckChange = (task: Task, isChecked: boolean) => {
        if (isChecked && task.status !== TaskStatus.Completed) {
            setTaskToComplete(task);
        } else if (!isChecked && task.status === TaskStatus.Completed) {
            onUpdateTask({ ...task, status: TaskStatus.InProgress, completionDetails: undefined });
        }
    };
    
    const handleConfirmCompletion = (details: { actualCost: number; category: ExpenseCategory; description: string; }) => {
        if (!taskToComplete) return;
        const updatedTask = {
            ...taskToComplete,
            status: TaskStatus.Completed,
            completionDetails: { ...details, completedAt: new Date().toISOString() }
        };
        onUpdateTask(updatedTask);
        setTaskToComplete(null);
    };

    return (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Tasks</h3>
                <button onClick={onAddTask} className="bg-brand-secondary text-white font-bold py-2 px-3 rounded-lg shadow-sm hover:bg-orange-600 flex items-center gap-1 text-sm"><PlusIcon className="w-5 h-5"/> New Task</button>
            </div>
            <ul className="space-y-3">
                {project.tasks.map(task => (
                    <li key={task.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                        <div className="flex items-center gap-4">
                            <input type="checkbox" className="h-5 w-5 rounded text-brand-primary focus:ring-brand-primary" checked={task.status === TaskStatus.Completed} onChange={(e) => handleCheckChange(task, e.target.checked)} />
                            <div>
                                <p className={`font-semibold ${task.status === TaskStatus.Completed ? 'line-through text-gray-500' : ''}`}>{task.name}</p>
                                <p className="text-sm text-gray-500">{task.description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <img src={task.assignedTo.avatarUrl} alt={task.assignedTo.name} className="w-8 h-8 rounded-full" title={`Assigned to ${task.assignedTo.name}`} />
                            <PriorityBadge priority={task.priority} />
                            <StatusBadge status={task.status} />
                            <button className="text-gray-400 hover:text-brand-primary"><DotsVerticalIcon /></button>
                        </div>
                    </li>
                ))}
                 {project.tasks.length === 0 && <p className="text-center py-4 text-gray-500">No tasks yet. Add one!</p>}
            </ul>
            {taskToComplete && <TaskCompletionModal task={taskToComplete} isOpen={!!taskToComplete} onClose={() => setTaskToComplete(null)} onConfirm={handleConfirmCompletion} />}
        </div>
    );
};

// ===================================================================================
// PROJECT DETAIL PAGE COMPONENT
// ===================================================================================
const ProjectDetailPage: FC<{ project: Project; onBack: () => void; onUpdateProject: (updatedProject: Project) => void; }> = ({ project, onBack, onUpdateProject }) => {
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

    const handleUpdateTask = (updatedTask: Task) => {
        const newTasks = project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        
        let completionPercentage = project.completionPercentage;
        // Only recalculate progress if the project is not already marked as completed.
        if (project.status !== ProjectStatus.Completed) {
             const completedTasks = newTasks.filter(t => t.status === TaskStatus.Completed).length;
             completionPercentage = newTasks.length > 0 ? Math.round((completedTasks / newTasks.length) * 100) : 0;
        }

        const spent = newTasks.reduce((acc, task) => acc + (task.completionDetails?.actualCost || 0), 0);
        
        onUpdateProject({ ...project, tasks: newTasks, completionPercentage, spent });
    };
    
    const handleAddTask = (newTaskData: NewTaskData) => {
        const newTask: Task = {
            id: `t-${project.id}-${Date.now()}`,
            status: TaskStatus.Pending,
            description: newTaskData.description || '',
            ...newTaskData,
        };
        const updatedTasks = [...project.tasks, newTask];
        
        let completionPercentage = project.completionPercentage;
        // Only recalculate progress if the project is not already marked as completed.
        if (project.status !== ProjectStatus.Completed) {
            const completedTasks = updatedTasks.filter(t => t.status === TaskStatus.Completed).length;
            completionPercentage = updatedTasks.length > 0 ? Math.round((completedTasks / updatedTasks.length) * 100) : 0;
        }

        const spent = updatedTasks.reduce((acc, task) => acc + (task.completionDetails?.actualCost || 0), 0);
        
        onUpdateProject({ ...project, tasks: updatedTasks, completionPercentage, spent });
        setIsCreateTaskModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 font-semibold text-brand-primary hover:underline">
                <ArrowLeftIcon /> Back to All Projects
            </button>

            {/* Header */}
            <div className="bg-base-100 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold text-base-content">{project.title}</h2>
                        <div className="flex items-center gap-2 mt-2">
                           <StatusBadge status={project.status} />
                           <PriorityBadge priority={project.priority} />
                        </div>
                    </div>
                     <div className="text-right">
                         <p className="font-semibold">{formatCurrency(project.spent)} / {formatCurrency(project.budget)}</p>
                         <p className="text-sm text-gray-500">Total Spent</p>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="flex justify-between text-sm font-medium mb-1"><p>Progress</p><p>{project.completionPercentage}%</p></div>
                    <div className="w-full bg-base-200 rounded-full h-2.5"><div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${project.completionPercentage}%` }}></div></div>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TaskList project={project} onUpdateTask={handleUpdateTask} onAddTask={() => setIsCreateTaskModalOpen(true)} />
                </div>
                <div className="bg-base-100 p-6 rounded-xl shadow-md space-y-4">
                    <h3 className="text-lg font-bold">Project Details</h3>
                    <div><p className="font-semibold">Project Manager</p><p>{project.teamLeader.name}</p></div>
                    <div><p className="font-semibold">Dates</p><p>{new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</p></div>
                    <div>
                        <p className="font-semibold">Team</p>
                        <div className="flex -space-x-2 mt-1">{project.team.map(m => <img key={m.id} src={m.avatarUrl} alt={m.name} title={m.name} className="w-8 h-8 rounded-full border-2 border-white"/>)}</div>
                    </div>
                     <div>
                        <p className="font-semibold">Tags</p>
                        <div className="flex flex-wrap gap-2 mt-1">{project.tags?.map(t => <span key={t} className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">{t}</span>)}</div>
                    </div>
                    <div><p className="font-semibold">Description</p><p className="text-sm text-gray-600">{project.description}</p></div>
                </div>
            </div>
            <CreateTaskModal 
                isOpen={isCreateTaskModalOpen}
                onClose={() => setIsCreateTaskModalOpen(false)}
                onSave={handleAddTask}
                users={project.team}
            />
        </div>
    );
};


// ===================================================================================
// MAIN PROJECTS PAGE COMPONENT (Router)
// ===================================================================================
const ProjectsPage: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>(mockProjects);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'title', direction: 'ascending' });


    const handleAddProject = (newProjectData: NewProjectData) => {
        const newProject: Project = {
            id: `p${Date.now()}`,
            status: ProjectStatus.NotStarted,
            completionPercentage: 0,
            spent: 0,
            tasks: [],
            expenses: [],
            team: [newProjectData.teamLeader],
            ...newProjectData,
        };
        setProjects(prevProjects => [newProject, ...prevProjects]);
        setIsModalOpen(false);
    };

    const handleUpdateProject = useCallback((updatedProject: Project) => {
        setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
    }, []);
    
    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => statusFilter === 'All' || p.status === statusFilter)
            .filter(p => priorityFilter === 'All' || p.priority === priorityFilter)
            .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [projects, searchTerm, statusFilter, priorityFilter]);

    const sortedProjects = useMemo(() => {
        let sortableProjects = [...filteredProjects];
        if (sortConfig !== null) {
            sortableProjects.sort((a, b) => {
                const key = sortConfig.key;

                const getSortableValue = (project: Project, sortKey: SortKey): string | number => {
                    switch(sortKey) {
                        case 'priority':
                            return priorityMap[project.priority];
                        case 'totalCost':
                            return project.spent;
                        case 'endDate':
                        case 'title':
                        case 'status':
                        case 'completionPercentage':
                            return project[sortKey];
                        default:
                            return 0;
                    }
                }

                const aValue = getSortableValue(a, key);
                const bValue = getSortableValue(b, key);
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableProjects;
    }, [filteredProjects, sortConfig]);

    const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
    
    if (selectedProjectId && selectedProject) {
        return <ProjectDetailPage project={selectedProject} onBack={() => setSelectedProjectId(null)} onUpdateProject={handleUpdateProject} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-base-content">Projects</h2>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors duration-300 flex items-center justify-center">
                    + New Project
                </button>
            </div>

            {/* Controls */}
            <div className="bg-base-100 p-4 rounded-xl shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative md:col-span-1">
                        <SearchIcon className="absolute w-5 h-5 text-gray-400 top-1/2 left-3 transform -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by project name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                        <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary">
                            <option value="All">All Statuses</option>
                            {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="priority-filter" className="sr-only">Filter by priority</label>
                        <select id="priority-filter" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary">
                            <option value="All">All Priorities</option>
                            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <ProjectsTable 
                projects={sortedProjects} 
                onViewProject={setSelectedProjectId}
                sortConfig={sortConfig}
                requestSort={requestSort}
            />

            <CreateProjectModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleAddProject}
                users={mockUsers}
            />
        </div>
    );
};

export default ProjectsPage;