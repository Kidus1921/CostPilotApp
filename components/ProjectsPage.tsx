
import React, { useState, useMemo, FC, useCallback, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, getDocs, writeBatch, query, where, deleteDoc } from "firebase/firestore";
import { db, storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Project, ProjectStatus, User, Task, TaskStatus, ExpenseCategory, UserRole, UserStatus as AppUserStatus, Document, NotificationType, NotificationPriority } from '../types';
import ProjectsTable, { SortKey } from './ProjectsTable';
import CreateProjectModal, { NewProjectData } from './CreateProjectModal';
import { ArrowLeftIcon, TrashIcon, PauseIcon, PlayIcon, CheckCircleIcon, PaperclipIcon, PhotographIcon, FilePdfIcon, FileExcelIcon, DocumentTextIcon, PlusIcon, SettingsIcon } from './IconComponents';
import { logActivity } from '../services/activityLogger';
import { createNotification } from '../services/notificationService';
import Avatar from './Avatar';

// ===================================================================================
// DATA SEEDING (For initial setup)
// ===================================================================================
const seedDatabase = async () => {
    console.log("Checking if seeding is needed...");
    const projectsCollection = collection(db, "projects");
    const snapshot = await getDocs(projectsCollection);
    if (snapshot.empty) {
        console.log("Database is empty. Seeding data...");
        const batch = writeBatch(db);

        const mockUsers: User[] = [
            { id: 'u1', name: 'Alice Johnson', email: 'alice@example.com', phone: '123-456-7890', role: UserRole.Admin, status: AppUserStatus.Active },
            { id: 'u2', name: 'Bob Williams', email: 'bob@example.com', phone: '123-456-7891', role: UserRole.ProjectManager, status: AppUserStatus.Active },
            { id: 'u3', name: 'Charlie Brown', email: 'charlie@example.com', phone: '123-456-7892', role: UserRole.ProjectManager, status: AppUserStatus.Active },
            { id: 'u4', name: 'Diana Prince', email: 'diana@example.com', phone: '123-456-7893', role: UserRole.ProjectManager, status: AppUserStatus.Inactive },
            { id: 'u5', name: 'Frank Miller', email: 'frank@example.com', phone: '123-456-7894', role: UserRole.Finance, status: AppUserStatus.Active },
        ];
        
        mockUsers.forEach(user => {
            const userRef = doc(db, "users", user.id!);
            batch.set(userRef, user);
        });

        const project1Tasks: Task[] = [
            { id: 't1-1', name: 'Design Database Schema', description: 'Plan and design the main database schema.', assignedTo: mockUsers[1], deadline: '2024-07-15', status: TaskStatus.Completed, estimatedCost: 1500, completionDetails: { description: 'DB schema finalized and reviewed.', category: ExpenseCategory.Labor, actualCost: 1400, completedAt: '2024-06-20' } },
            { id: 't1-2', name: 'Develop API Endpoints', description: 'Create RESTful APIs for core functionalities.', assignedTo: mockUsers[2], deadline: '2024-07-25', status: TaskStatus.InProgress, estimatedCost: 3000 },
            { id: 't1-3', name: 'Implement User Authentication', description: 'Set up JWT-based authentication.', assignedTo: mockUsers[2], deadline: '2024-07-28', status: TaskStatus.Pending, estimatedCost: 2000 },
            { id: 't1-4', name: 'Build Frontend Dashboard', description: 'Develop the main dashboard UI.', assignedTo: mockUsers[3], deadline: '2024-08-10', status: TaskStatus.Pending, estimatedCost: 4000 },
        ];
        const project2Tasks: Task[] = [
            { id: 't2-1', name: 'Market Research', description: 'Analyze competitors and target audience.', assignedTo: mockUsers[0], status: TaskStatus.Completed, completionDetails: { description: 'Analysis complete', category: ExpenseCategory.Labor, actualCost: 2000, completedAt: '2024-05-10'} },
            { id: 't2-2', name: 'UI/UX Wireframing', description: 'Create wireframes for all main pages.', assignedTo: mockUsers[3], status: TaskStatus.InProgress },
        ];
        
        const mockProjects: Omit<Project, 'id'>[] = [
            { title: 'Quantum CRM Development', description: 'Next-gen customer relationship management platform.', startDate: '2023-01-15', endDate: '2024-07-30', teamLeader: mockUsers[0], team: mockUsers.slice(0, 3), tags: ['CRM', 'SaaS', 'React'], status: ProjectStatus.InProgress, completionPercentage: 25, budget: 150000, spent: 1400, tasks: project1Tasks, expenses: [], documents: [], isAccessEnabled: true },
            { title: 'E-commerce Platform Overhaul', description: 'Complete redesign and migration of the existing online store.', startDate: '2023-03-01', endDate: '2024-08-15', teamLeader: mockUsers[1], team: [mockUsers[1], mockUsers[3]], tags: ['E-commerce', 'Migration'], status: ProjectStatus.InProgress, completionPercentage: 50, budget: 250000, spent: 2000, tasks: project2Tasks, expenses: [], documents: [], isAccessEnabled: true },
            { title: 'Mobile App "ConnectU"', description: 'A new social networking app for professionals.', startDate: '2023-06-10', endDate: '2024-12-20', teamLeader: mockUsers[2], team: [mockUsers[2], mockUsers[0]], status: ProjectStatus.Pending, completionPercentage: 0, budget: 80000, spent: 0, tasks: [], expenses: [], documents: [], isAccessEnabled: true },
            { title: 'Data Center Migration', description: 'Migrating all servers to a new cloud infrastructure.', startDate: '2022-11-01', endDate: '2024-05-20', teamLeader: mockUsers[0], team: mockUsers.slice(0,2), status: ProjectStatus.Completed, completionPercentage: 100, budget: 300000, spent: 285000, tasks: [], expenses: [], documents: [], isAccessEnabled: true },
            { title: 'Internal HR Portal', description: 'A new portal for employee management.', startDate: '2023-09-01', endDate: '2024-09-30', teamLeader: mockUsers[1], team: [mockUsers[1]], status: ProjectStatus.OnHold, completionPercentage: 0, budget: 45000, spent: 0, tasks: [], expenses: [], documents: [], isAccessEnabled: true },
        ];

        mockProjects.forEach(project => {
            const newProjectRef = doc(projectsCollection);
            batch.set(newProjectRef, project);
        });

        await batch.commit();
        console.log("Seeding complete.");
    } else {
        console.log("Database already contains data. Skipping seed.");
    }
};


// ===================================================================================
// HELPER COMPONENTS & UTILS
// ===================================================================================
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const StatusBadge: React.FC<{ status: ProjectStatus | TaskStatus }> = ({ status }) => {
    const colorMap: Record<string, string> = {
        [ProjectStatus.InProgress]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', [ProjectStatus.Completed]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', [ProjectStatus.OnHold]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', [ProjectStatus.Pending]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
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
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md dark:bg-gray-800">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Complete Task: {task.name}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="actualCost" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Actual Cost Spent ($)</label>
                        <input type="number" id="actualCost" value={actualCost} onChange={e => setActualCost(Number(e.target.value))} required className="mt-1 block w-full px-3 py-2 bg-base-100 text-base-content border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Category</label>
                        <select id="category" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} required className="mt-1 block w-full pl-3 pr-10 py-2 bg-base-100 text-base-content border-base-300 focus:outline-none focus:ring-brand-primary rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="comp-description" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Completion Description</label>
                        <textarea id="comp-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} required className="mt-1 block w-full px-3 py-2 bg-base-100 text-base-content border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content font-bold py-2 px-4 rounded-lg hover:bg-base-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">Confirm Completion</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// ===================================================================================
// TASK LIST COMPONENT
// ===================================================================================
const TaskList: FC<{ 
    project: Project; 
    onUpdateTask: (updatedTask: Task) => void; 
    onAddTask: (taskName: string) => void; 
    onDeleteTask: (taskId: string, taskName: string) => void;
    canManage: boolean;
}> = ({ project, onUpdateTask, onAddTask, onDeleteTask, canManage }) => {
    const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
    const [newTaskName, setNewTaskName] = useState('');
    const isProjectPending = project.status === ProjectStatus.Pending;

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

    const handleAddTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskName.trim()) {
            onAddTask(newTaskName.trim());
            setNewTaskName('');
        }
    };

    return (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm dark:bg-gray-800">
             <h3 className="text-xl font-bold mb-4 dark:text-white">Tasks</h3>
             {isProjectPending && (
                <div className="text-center py-4 px-2 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/30 dark:border-yellow-800/50">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">This project is pending approval. Tasks cannot be added or modified.</p>
                </div>
             )}
            <ul className="space-y-3 mt-4">
                {(project.tasks || []).map(task => (
                    <li key={task.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg dark:bg-gray-700/50">
                        <div className="flex items-center gap-4">
                            <input type="checkbox" className="h-5 w-5 rounded text-brand-primary focus:ring-brand-primary disabled:bg-gray-300 dark:bg-gray-600 dark:focus:ring-offset-gray-800" checked={task.status === TaskStatus.Completed} onChange={(e) => handleCheckChange(task, e.target.checked)} disabled={isProjectPending} />
                            <div>
                                <p className={`font-semibold ${task.status === TaskStatus.Completed ? 'line-through text-gray-500 dark:text-gray-500' : 'dark:text-gray-100'}`}>{task.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{task.description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <Avatar name={task.assignedTo.name} size="sm" />
                            <StatusBadge status={task.status} />
                            {canManage && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id, task.name); }} 
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-500 dark:hover:text-red-500"
                                    aria-label={`Delete task ${task.name}`}
                                    disabled={isProjectPending}
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                    </li>
                ))}
                 {(project.tasks || []).length === 0 && !isProjectPending && <p className="text-center py-4 text-gray-500 dark:text-gray-400">No tasks yet. Add one!</p>}
            </ul>
            {!isProjectPending && canManage && (
                 <form onSubmit={handleAddTaskSubmit} className="mt-4 flex gap-2">
                    <input 
                        type="text" 
                        value={newTaskName} 
                        onChange={(e) => setNewTaskName(e.target.value)} 
                        placeholder="Add a new task..."
                        className="flex-grow px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary bg-base-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <button type="submit" className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">Add Task</button>
                </form>
            )}
            {taskToComplete && <TaskCompletionModal task={taskToComplete} isOpen={!!taskToComplete} onClose={() => setTaskToComplete(null)} onConfirm={handleConfirmCompletion} />}
        </div>
    );
};

// ===================================================================================
// DOCUMENTS LIST COMPONENT
// ===================================================================================
const FileTypeIcon: FC<{ mimeType: string }> = ({ mimeType }) => {
    const className = "w-8 h-8 flex-shrink-0";
    if (mimeType.startsWith('image/')) return <PhotographIcon className={`${className} text-purple-500`} />;
    if (mimeType === 'application/pdf') return <FilePdfIcon className={`${className} text-red-500`} />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileExcelIcon className={`${className} text-green-500`} />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <DocumentTextIcon className={`${className} text-blue-500`} />;
    return <PaperclipIcon className={`${className} text-gray-500`} />;
};

const DocumentsList: FC<{ 
    project: Project; 
    onUpdateProject: (data: Partial<Project>) => void;
    canManage: boolean;
}> = ({ project, onUpdateProject, canManage }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !project.id) return;

        setUploading(true);
        setError(null);

        try {
            const storageRef = ref(storage, `projects/${project.id}/documents/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const newDocument: Document = {
                id: snapshot.ref.fullPath,
                name: file.name,
                url: downloadURL,
                type: file.type,
                uploadedAt: new Date().toISOString(),
                uploadedBy: { id: 'u1', name: 'Alice Johnson' } // Hardcoded current user
            };

            const updatedDocuments = [...(project.documents || []), newDocument];
            onUpdateProject({ documents: updatedDocuments });
            logActivity('Uploaded Document', `${file.name} to project ${project.title}`);
        } catch (err) {
            console.error("File upload failed:", err);
            setError("File upload failed. Please try again.");
        } finally {
            setUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    const handleFileDelete = async (docToDelete: Document) => {
        if (!project.id || !window.confirm(`Are you sure you want to delete "${docToDelete.name}"?`)) return;

        try {
            const fileRef = ref(storage, docToDelete.id);
            await deleteObject(fileRef);

            const updatedDocuments = (project.documents || []).filter(doc => doc.id !== docToDelete.id);
            onUpdateProject({ documents: updatedDocuments });
            logActivity('Deleted Document', `${docToDelete.name} from project ${project.title}`);
        } catch (err) {
             console.error("File deletion failed:", err);
             alert("Failed to delete file. It may have already been removed.");
        }
    };

    return (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold dark:text-white">Project Documents</h3>
                {canManage && (
                    <>
                        <label htmlFor="file-upload" className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors cursor-pointer flex items-center gap-2">
                            <PlusIcon className="w-5 h-5"/> Upload
                        </label>
                        <input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" disabled={uploading} />
                    </>
                )}
            </div>
             {uploading && <div className="text-center p-4 text-brand-primary dark:text-teal-400">Uploading...</div>}
             {error && <div className="text-center p-4 text-red-500">{error}</div>}

            <ul className="space-y-3 mt-4">
                {(project.documents || []).length > 0 ? (project.documents || []).map(doc => (
                     <li key={doc.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg dark:bg-gray-700/50">
                        <div className="flex items-center gap-4 truncate">
                           <FileTypeIcon mimeType={doc.type} />
                           <div className="truncate">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline dark:text-gray-100 truncate">{doc.name}</a>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()} by {doc.uploadedBy.name}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {canManage && (
                                <button onClick={() => handleFileDelete(doc)} className="text-gray-400 hover:text-red-500 p-1 rounded-full dark:text-gray-500 dark:hover:text-red-500" aria-label={`Delete ${doc.name}`}>
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                     </li>
                )) : (
                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">No documents uploaded yet.</p>
                )}
            </ul>
        </div>
    );
};

// ===================================================================================
// PROJECT DETAIL PAGE COMPONENT
// ===================================================================================
interface ProjectDetailPageProps {
    project: Project;
    currentUser: User;
    onBack: () => void;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

const ProjectDetailPage: FC<ProjectDetailPageProps> = ({ project, currentUser, onBack, canEdit, canDelete, onEdit, onDelete }) => {
    
    const projectRef = doc(db, "projects", project.id!);
    const isAdmin = currentUser.role === UserRole.Admin;

    // Granular Privilege Checks
    const canManageTasks = isAdmin || (currentUser.privileges?.includes('can_manage_tasks') ?? false);
    const canManageDocs = isAdmin || (currentUser.privileges?.includes('can_manage_documents') ?? false);

    const updateProjectInDb = async (updatedProjectData: Partial<Project>) => {
        await updateDoc(projectRef, updatedProjectData);
    };

    const handleUpdateTask = (updatedTask: Task) => {
        if (updatedTask.status === TaskStatus.Completed && project.status !== ProjectStatus.Completed) {
            logActivity('Completed Task', `${updatedTask.name} in project ${project.title}`);
            createNotification({
                userId: project.teamLeader.id!,
                title: 'Task Completed',
                message: `Task "${updatedTask.name}" in project "${project.title}" has been marked as complete.`,
                type: NotificationType.TaskUpdate,
                priority: NotificationPriority.Medium,
                link: `/projects/${project.id}`
            });
        }

        const newTasks = (project.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t);
        
        let completionPercentage = project.completionPercentage;
        if (project.status !== ProjectStatus.Completed) {
             const completedTasks = newTasks.filter(t => t.status === TaskStatus.Completed).length;
             completionPercentage = newTasks.length > 0 ? Math.round((completedTasks / newTasks.length) * 100) : 0;
        }

        const oldSpent = project.spent;
        const spent = newTasks.reduce((acc, task) => acc + (task.completionDetails?.actualCost || 0), 0);
        
        updateProjectInDb({ tasks: newTasks, completionPercentage, spent });
        
        // Check for cost overrun
        if (spent > project.budget && oldSpent <= project.budget) {
            createNotification({
                userId: project.teamLeader.id!,
                title: 'Budget Alert: Cost Overrun',
                message: `Project "${project.title}" has exceeded its budget. Current spend is ${formatCurrency(spent)}.`,
                type: NotificationType.CostOverrun,
                priority: NotificationPriority.High,
                link: `/projects/${project.id}`
            });
        }
    };
    
    const handleAddTask = (taskName: string) => {
        if (!canManageTasks) return;
        const newTask: Task = {
            id: `t-${project.id}-${Date.now()}`,
            name: taskName,
            description: '',
            assignedTo: project.teamLeader,
            status: TaskStatus.Pending,
        };
        const updatedTasks = [...(project.tasks || []), newTask];
        logActivity('Added Task', `${taskName} to project ${project.title}`);
        
        let completionPercentage = project.completionPercentage;
        if (project.status !== ProjectStatus.Completed) {
            const completedTasks = updatedTasks.filter(t => t.status === TaskStatus.Completed).length;
            completionPercentage = updatedTasks.length > 0 ? Math.round((completedTasks / updatedTasks.length) * 100) : 0;
        }
        
        updateProjectInDb({ tasks: updatedTasks, completionPercentage });
    };

    const handleDeleteTask = (taskIdToDelete: string, taskName: string) => {
        if (!canManageTasks) return;
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }
        const updatedTasks = (project.tasks || []).filter(task => task.id !== taskIdToDelete);
        logActivity('Deleted Task', `${taskName} from project ${project.title}`);

        let completionPercentage = project.completionPercentage;
        if (project.status !== ProjectStatus.Completed) {
            const completedTasks = updatedTasks.filter(t => t.status === TaskStatus.Completed).length;
            completionPercentage = updatedTasks.length > 0 ? Math.round((completedTasks / updatedTasks.length) * 100) : 0;
        }
        const spent = updatedTasks.reduce((acc, task) => acc + (task.completionDetails?.actualCost || 0), 0);
        
        updateProjectInDb({ tasks: updatedTasks, completionPercentage, spent });
    };

    const handleToggleHold = () => {
        const newStatus = project.status === ProjectStatus.InProgress 
            ? ProjectStatus.OnHold 
            : ProjectStatus.InProgress;
        logActivity('Changed Project Status', `for ${project.title} to ${newStatus}`);
        updateProjectInDb({ status: newStatus });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2 font-semibold text-brand-primary hover:underline">
                    <ArrowLeftIcon /> Back to All Projects
                </button>
                
                <div className="flex gap-2">
                    {canEdit && (
                        <button 
                            onClick={onEdit}
                            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <SettingsIcon className="w-4 h-4"/> Edit Project
                        </button>
                    )}
                    {canDelete && (
                        <button 
                            onClick={onDelete}
                            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                            <TrashIcon className="w-4 h-4"/> Delete Project
                        </button>
                    )}
                </div>
            </div>

            {/* Header */}
            <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold text-base-content dark:text-white">{project.title}</h2>
                        <div className="flex items-center gap-4 mt-2">
                           <StatusBadge status={project.status} />
                           {(project.status === ProjectStatus.InProgress || project.status === ProjectStatus.OnHold) && (
                               <button onClick={handleToggleHold} className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-black bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md transition-colors dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                                   {project.status === ProjectStatus.InProgress ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                                   {project.status === ProjectStatus.InProgress ? 'Put on Hold' : 'Resume Project'}
                                </button>
                           )}
                        </div>
                    </div>
                     <div className="flex flex-col items-end gap-4">
                        <div className="text-right">
                             <p className="font-semibold dark:text-white">{formatCurrency(project.spent)} / {formatCurrency(project.budget)}</p>
                             <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="flex justify-between text-sm font-medium mb-1 dark:text-gray-200"><p>Progress</p><p>{project.completionPercentage}%</p></div>
                    <div className="w-full bg-base-200 rounded-full h-2.5 dark:bg-gray-700"><div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${project.completionPercentage}%` }}></div></div>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <TaskList 
                        project={project} 
                        onUpdateTask={handleUpdateTask} 
                        onAddTask={handleAddTask} 
                        onDeleteTask={handleDeleteTask}
                        canManage={canManageTasks}
                    />
                    <DocumentsList 
                        project={project} 
                        onUpdateProject={updateProjectInDb} 
                        canManage={canManageDocs}
                    />
                </div>
                <div className="bg-base-100 p-6 rounded-xl shadow-md space-y-4 dark:bg-gray-800">
                    <h3 className="text-lg font-bold dark:text-white">Project Details</h3>
                    <div><p className="font-semibold dark:text-gray-200">Project Manager</p><p className="dark:text-gray-300">{project.teamLeader.name}</p></div>
                    <div><p className="font-semibold dark:text-gray-200">Dates</p><p className="dark:text-gray-300">{new Date(project.startDate).toLocaleDateString()}</p></div>
                    <div>
                        <p className="font-semibold dark:text-gray-200">Team</p>
                        <div className="flex -space-x-2 mt-1">{project.team.map(m => <Avatar key={m.id} name={m.name} size="sm" className="border-2 border-white dark:border-gray-800" />)}</div>
                    </div>
                     <div>
                        <p className="font-semibold dark:text-gray-200">Tags</p>
                        <div className="flex flex-wrap gap-2 mt-1">{project.tags?.map(t => <span key={t} className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full dark:bg-teal-900/50 dark:text-teal-300">{t}</span>)}</div>
                    </div>
                    <div><p className="font-semibold dark:text-gray-200">Description</p><p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p></div>
                </div>
            </div>
        </div>
    );
};


// ===================================================================================
// MAIN PROJECTS PAGE COMPONENT (Router)
// ===================================================================================
const ProjectsPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | undefined>(undefined);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'title', direction: 'ascending' });
    
    // Permission Checks
    const isAdmin = currentUser.role === UserRole.Admin;
    const canCreate = isAdmin || (currentUser.privileges?.includes('can_create_project') ?? false);
    const canEdit = isAdmin || (currentUser.privileges?.includes('can_edit_project') ?? false);
    const canDelete = isAdmin || (currentUser.privileges?.includes('can_delete_project') ?? false);

    useEffect(() => {
        seedDatabase(); // Check and seed database on initial load

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
                projectsData.push({ id: doc.id, ...doc.data() } as Project);
            });
            setProjects(projectsData);
            if (!projectsLoaded) {
                projectsLoaded = true;
                checkLoading();
            }
            setError(null);
        }, (err) => {
            console.error("Error fetching projects:", err);
            setError("Failed to load project data.");
            setLoading(false);
        });

        const qUsers = query(collection(db, "users"));
        const unsubscribeUsers = onSnapshot(qUsers, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ id: doc.id, ...doc.data() } as User);
            });
            setUsers(usersData);
            if (!usersLoaded) {
                usersLoaded = true;
                checkLoading();
            }
            setError(null);
        }, (err) => {
            console.error("Error fetching users:", err);
            setError("Failed to load user data.");
            setLoading(false);
        });

        return () => {
            unsubscribeProjects();
            unsubscribeUsers();
        };
    }, []);

    const visibleProjects = useMemo(() => {
        if (isAdmin) return projects;
        // Non-admins only see projects where isAccessEnabled is true (or undefined)
        return projects.filter(p => p.isAccessEnabled !== false);
    }, [projects, isAdmin]);


    const handleSaveProject = async (projectData: NewProjectData) => {
        try {
            if (projectToEdit && projectToEdit.id) {
                // Update existing project
                const projectRef = doc(db, "projects", projectToEdit.id);
                await updateDoc(projectRef, {
                    title: projectData.title,
                    description: projectData.description,
                    endDate: projectData.endDate,
                    teamLeader: projectData.teamLeader,
                    tags: projectData.tags,
                    budget: projectData.budget
                });
                logActivity('Updated Project', projectData.title);
            } else {
                // Create new project
                const newProject: Omit<Project, 'id'> = {
                    status: ProjectStatus.Pending,
                    completionPercentage: 0,
                    spent: 0,
                    tasks: [],
                    expenses: [],
                    documents: [],
                    team: [projectData.teamLeader],
                    startDate: new Date().toISOString().split('T')[0],
                    isAccessEnabled: true, // Default to true
                    ...projectData,
                };
                await addDoc(collection(db, "projects"), newProject);
                logActivity('Created Project', newProject.title);
                
                // Notify admins
                const adminQuery = query(collection(db, "users"), where("role", "==", UserRole.Admin));
                const adminSnapshot = await getDocs(adminQuery);
                adminSnapshot.forEach(adminDoc => {
                    createNotification({
                        userId: adminDoc.id,
                        title: 'New Project for Approval',
                        message: `"${newProject.title}" has been submitted for budget approval.`,
                        type: NotificationType.ApprovalRequest,
                        priority: NotificationPriority.High,
                        link: `/financials`
                    });
                });
            }
            setIsModalOpen(false);
            setProjectToEdit(undefined);
        } catch (e) {
            console.error("Error saving project: ", e);
            alert("Failed to save project.");
        }
    };
    
    const handleDeleteProject = async (project: Project) => {
        if (!canDelete) return;
        if (!project.id || !window.confirm(`Are you sure you want to delete project "${project.title}"? This action cannot be undone.`)) return;
        
        try {
            await deleteDoc(doc(db, "projects", project.id));
            logActivity('Deleted Project', project.title);
            setSelectedProjectId(null); // Go back to list if we were in detail view
        } catch (e) {
            console.error("Error deleting project: ", e);
            alert("Failed to delete project.");
        }
    };

    const openCreateModal = () => {
        setProjectToEdit(undefined);
        setIsModalOpen(true);
    };

    const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

    const openEditModal = () => {
        if (selectedProject) {
            setProjectToEdit(selectedProject);
            setIsModalOpen(true);
        }
    };

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedProjects = useMemo(() => {
        let sortableProjects = [...visibleProjects];
        if (sortConfig !== null) {
            sortableProjects.sort((a, b) => {
                const key = sortConfig.key;

                const getSortableValue = (project: Project, sortKey: SortKey): string | number => {
                    switch(sortKey) {
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
    }, [visibleProjects, sortConfig]);

    
    if (loading) {
        return <div className="text-center p-10">Loading Projects...</div>;
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                <h3 className="text-lg font-bold">An Error Occurred</h3>
                <p className="mt-2">{error}</p>
            </div>
        );
    }

    const renderContent = () => {
        if (selectedProjectId && selectedProject) {
            // Ensure user still has access to the selected project (e.g. if privilege changed while viewing)
            if (!isAdmin && selectedProject.isAccessEnabled === false) {
                setSelectedProjectId(null);
                return <div>Access Denied</div>; 
            }
            return (
                <ProjectDetailPage 
                    project={selectedProject} 
                    currentUser={currentUser}
                    onBack={() => setSelectedProjectId(null)} 
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={openEditModal}
                    onDelete={() => handleDeleteProject(selectedProject)}
                />
            );
        }
    
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h2 className="text-3xl font-bold text-base-content dark:text-gray-100">Projects</h2>
                    {canCreate && (
                        <button 
                            onClick={openCreateModal}
                            className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors duration-300 flex items-center justify-center">
                            + New Project
                        </button>
                    )}
                </div>
    
                <ProjectsTable 
                    projects={sortedProjects} 
                    onViewProject={setSelectedProjectId}
                    sortConfig={sortConfig}
                    requestSort={requestSort}
                    currentUser={currentUser}
                    canDelete={canDelete}
                    onDeleteProject={handleDeleteProject}
                />
            </div>
        );
    };

    return (
        <>
            {renderContent()}
            <CreateProjectModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveProject}
                users={users}
                initialData={projectToEdit}
            />
        </>
    );
};

export default ProjectsPage;