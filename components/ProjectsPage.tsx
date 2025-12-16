
import React, { useState, useMemo, FC, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Project, ProjectStatus, User, Task, TaskStatus, ExpenseCategory, UserRole, Document, NotificationType, NotificationPriority } from '../types';
import { useAppContext } from '../AppContext';
import ProjectsTable, { SortKey } from './ProjectsTable';
import CreateProjectModal, { NewProjectData } from './CreateProjectModal';
import { ArrowLeftIcon, TrashIcon, PauseIcon, PlayIcon, PaperclipIcon, PhotographIcon, FilePdfIcon, FileExcelIcon, DocumentTextIcon, PlusIcon, SettingsIcon, PencilIcon, CalendarIcon, CheckIcon, CheckCircleIcon, ClockIcon, FolderIcon } from './IconComponents';
import { logActivity } from '../services/activityLogger';
import { createNotification } from '../services/notificationService';
import Avatar from './Avatar';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const StatusBadge: React.FC<{ status: ProjectStatus | TaskStatus }> = ({ status }) => {
    const colorMap: Record<string, string> = {
        [ProjectStatus.InProgress]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [ProjectStatus.Completed]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [ProjectStatus.OnHold]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [ProjectStatus.Pending]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        [ProjectStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[status] || 'bg-gray-100'}`}>{status}</span>
};

const EditTaskModal: FC<{ task: Task; projectMembers: User[]; isOpen: boolean; onClose: () => void; onSave: (updatedTask: Task) => void }> = ({ task, projectMembers, isOpen, onClose, onSave }) => {
    const [name, setName] = useState(task.name);
    const [assignedToId, setAssignedToId] = useState(task.assignedTo?.id || '');
    const [deadline, setDeadline] = useState(task.deadline || '');
    const [estimatedCost, setEstimatedCost] = useState(task.estimatedCost || 0);

    useEffect(() => {
        if(isOpen) {
            setName(task.name);
            setAssignedToId(task.assignedTo?.id || '');
            setDeadline(task.deadline || '');
            setEstimatedCost(task.estimatedCost || 0);
        }
    }, [isOpen, task]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const assignee = projectMembers.find(u => u.id === assignedToId) || task.assignedTo;
        onSave({ 
            ...task, 
            name, 
            assignedTo: assignee, 
            deadline, 
            estimatedCost 
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md dark:bg-gray-800">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Edit Task</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Task Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Assign To</label>
                        <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {projectMembers.map(u => <option key={u.id} value={u.id!}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Deadline</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:[color-scheme:dark]" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Estimated Cost</label>
                        <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(Number(e.target.value))} min="0" className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content py-2 px-4 rounded-lg hover:bg-base-300 dark:bg-gray-600 dark:text-white">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-white py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

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
                        <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Actual Cost ($)</label>
                        <input type="number" value={actualCost} onChange={e => setActualCost(Number(e.target.value))} required min="0" className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} required className="mt-1 block w-full px-3 py-2 bg-base-100 border-base-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Description / Notes</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional notes..." className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content py-2 px-4 rounded-lg hover:bg-base-300 dark:bg-gray-600 dark:text-white">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-white py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">Confirm Completion</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TaskList: FC<{ project: Project; onUpdateTask: (task: Task) => void; onAddTask: (name: string) => void; onDeleteTask: (id: string, name: string) => void; }> = ({ project, onUpdateTask, onAddTask, onDeleteTask }) => {
    const { checkPermission } = useAppContext();
    const canManageTasks = checkPermission('can_manage_tasks');
    
    const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [newTaskName, setNewTaskName] = useState('');
    
    // Lock adding tasks if Pending or Rejected
    const isLocked = project.status === ProjectStatus.Pending || project.status === ProjectStatus.Rejected;

    // Deduplicate project team members for assignment
    const projectMembers = useMemo(() => {
        const members = [project.teamLeader, ...(project.team || [])];
        return members.filter((u, i, self) => i === self.findIndex(t => t.id === u.id));
    }, [project.team, project.teamLeader]);

    const confirmComplete = (details: any) => {
        if (!taskToComplete) return;
        onUpdateTask({ 
            ...taskToComplete, 
            status: TaskStatus.Completed, 
            completionDetails: { 
                ...details, 
                completedAt: new Date().toISOString() 
            } 
        });
        setTaskToComplete(null);
    };

    return (
        <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
            <h3 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2"><CheckCircleIcon className="w-6 h-6 text-brand-primary"/> Tasks</h3>
            {isLocked && (
                <div className={`text-center py-2 mb-4 rounded text-sm border ${project.status === ProjectStatus.Rejected ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800'}`}>
                    Project is {project.status}. Tasks are locked.
                </div>
            )}
            
            <ul className="space-y-3">
                {(project.tasks || []).map(task => {
                    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== TaskStatus.Completed;
                    return (
                        <li key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-base-100 border border-base-200 rounded-xl shadow-sm hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700 gap-4 group">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="mt-1">
                                    <StatusBadge status={task.status} />
                                </div>
                                <div>
                                    <h4 className={`font-bold text-base-content dark:text-white ${task.status === TaskStatus.Completed ? 'line-through opacity-70' : ''}`}>{task.name}</h4>
                                    
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-base-content-secondary dark:text-gray-400 mt-2">
                                        <div className="flex items-center gap-1.5" title="Assigned To">
                                            <Avatar name={task.assignedTo?.name || '?'} size="sm" className="w-5 h-5 text-xs" /> 
                                            <span className="truncate max-w-[120px]">{task.assignedTo?.name}</span>
                                        </div>
                                        
                                        {task.deadline && (
                                            <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-medium' : ''}`} title="Deadline">
                                                <CalendarIcon className="w-4 h-4" /> 
                                                <span>{new Date(task.deadline).toLocaleDateString()}</span>
                                                {isOverdue && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">Overdue</span>}
                                            </div>
                                        )}
                                        
                                        {(task.estimatedCost || 0) > 0 && (
                                            <div className="flex items-center gap-1" title="Estimated Cost">
                                                <span className="font-semibold text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">Est: {formatCurrency(task.estimatedCost || 0)}</span>
                                            </div>
                                        )}

                                        {task.status === TaskStatus.Completed && task.completionDetails && (
                                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                                <CheckIcon className="w-4 h-4"/>
                                                <span>Actual: {formatCurrency(task.completionDetails.actualCost)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                {task.status !== TaskStatus.Completed && canManageTasks && !isLocked && (
                                    <button 
                                        onClick={() => setTaskToComplete(task)} 
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded shadow-sm transition-colors flex items-center gap-1"
                                    >
                                        <CheckIcon className="w-3 h-3"/> Complete
                                    </button>
                                )}
                                
                                {canManageTasks && !isLocked && (
                                    <>
                                        <button onClick={() => setTaskToEdit(task)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors dark:hover:bg-blue-900/30 dark:hover:text-blue-400" title="Edit Task">
                                            <PencilIcon className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => onDeleteTask(task.id, task.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors dark:hover:bg-red-900/30 dark:hover:text-red-400" title="Delete Task">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </>
                                )}
                            </div>
                        </li>
                    );
                })}
                {(project.tasks || []).length === 0 && (
                    <li className="text-center text-gray-500 text-sm py-8 border-2 border-dashed border-gray-300 rounded-xl dark:border-gray-700">No tasks added yet.</li>
                )}
            </ul>

            {canManageTasks && !isLocked && (
                <form onSubmit={e => { e.preventDefault(); if(newTaskName.trim()) { onAddTask(newTaskName.trim()); setNewTaskName(''); } }} className="mt-6 flex gap-2">
                    <div className="relative flex-grow">
                        <PlusIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input 
                            type="text" 
                            value={newTaskName} 
                            onChange={e => setNewTaskName(e.target.value)} 
                            placeholder="Add a new task..." 
                            className="w-full pl-10 pr-3 py-3 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary bg-base-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm" 
                        />
                    </div>
                    <button type="submit" className="bg-brand-primary text-white py-2 px-6 rounded-lg hover:bg-teal-700 transition-colors shadow-md font-semibold">Add</button>
                </form>
            )}
            
            {taskToComplete && (
                <TaskCompletionModal 
                    task={taskToComplete} 
                    isOpen={!!taskToComplete} 
                    onClose={() => setTaskToComplete(null)} 
                    onConfirm={confirmComplete} 
                />
            )}
            
            {taskToEdit && (
                <EditTaskModal 
                    task={taskToEdit}
                    projectMembers={projectMembers}
                    isOpen={!!taskToEdit}
                    onClose={() => setTaskToEdit(null)}
                    onSave={onUpdateTask}
                />
            )}
        </div>
    );
};

const DocumentsList: FC<{ project: Project; onUpdateProject: (p: Partial<Project>) => void; currentUser: User }> = ({ project, onUpdateProject, currentUser }) => {
    const { checkPermission } = useAppContext();
    const canManageDocs = checkPermission('can_manage_documents');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // RESTRICTION: Reject upload if project is Rejected, unless User is Admin
    const isRejected = project.status === ProjectStatus.Rejected;
    const isAdmin = currentUser.role === UserRole.Admin;
    const canUpload = canManageDocs && (!isRejected || isAdmin);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !project.id) return;
        setUploading(true);
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage.from('project-documents').upload(`${project.id}/${fileName}`, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('project-documents').getPublicUrl(`${project.id}/${fileName}`);
            
            const newDoc: Document = { id: data.path, name: file.name, url: publicUrl, type: file.type, uploadedAt: new Date().toISOString(), uploadedBy: { id: currentUser.id!, name: currentUser.name } };
            onUpdateProject({ documents: [...(project.documents || []), newDoc] });
            logActivity('Uploaded Document', `${file.name} to ${project.title}`, currentUser);
        } catch (err) { console.error(err); alert("Upload failed."); } 
        finally { setUploading(false); if(fileInputRef.current) fileInputRef.current.value = ""; }
    };

    const handleDelete = async (doc: Document) => {
        if (!confirm(`Delete ${doc.name}?`)) return;
        const { error } = await supabase.storage.from('project-documents').remove([doc.id]);
        if (!error) {
            onUpdateProject({ documents: (project.documents || []).filter(d => d.id !== doc.id) });
            logActivity('Deleted Document', `${doc.name}`, currentUser);
        }
    };

    const getIcon = (mime: string) => {
        if (mime.startsWith('image/')) return <PhotographIcon className="w-6 h-6 text-purple-500" />;
        if (mime === 'application/pdf') return <FilePdfIcon className="w-6 h-6 text-red-500" />;
        return <PaperclipIcon className="w-6 h-6 text-gray-500" />;
    };

    return (
        <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold dark:text-white flex items-center gap-2"><FolderIcon className="w-6 h-6 text-yellow-500"/> Documents</h3>
                {canUpload && (
                    <>
                        <label htmlFor="doc-upload" className="cursor-pointer text-brand-primary flex items-center gap-1 hover:text-teal-700 transition-colors font-medium bg-teal-50 px-3 py-1.5 rounded-lg dark:bg-teal-900/20">
                            <PlusIcon className="w-5 h-5"/> Upload
                        </label>
                        <input id="doc-upload" type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" disabled={uploading} />
                    </>
                )}
            </div>
            {uploading && <div className="text-sm text-brand-primary animate-pulse mb-2">Uploading file...</div>}
            
            {/* Warning for non-admins on Rejected projects */}
            {isRejected && !isAdmin && (
                <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-800">
                    Project is rejected. Document uploads are restricted.
                </div>
            )}

            <ul className="space-y-3">
                {(project.documents || []).map(doc => (
                    <li key={doc.id} className="flex justify-between items-center p-3 bg-base-200 rounded-lg dark:bg-gray-700/50 hover:bg-base-300 dark:hover:bg-gray-700 transition-colors group">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {getIcon(doc.type)}
                            <div className="flex flex-col">
                                <a href={doc.url} target="_blank" rel="noreferrer" className="truncate hover:underline dark:text-gray-100 font-medium">{doc.name}</a>
                                <span className="text-xs text-gray-500">by {doc.uploadedBy.name} • {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        {canUpload && <button onClick={() => handleDelete(doc)} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"><TrashIcon className="w-5 h-5"/></button>}
                    </li>
                ))}
                {(project.documents || []).length === 0 && (
                     <li className="text-center text-gray-500 text-sm py-8 border-2 border-dashed border-gray-300 rounded-xl dark:border-gray-700">No documents attached.</li>
                )}
            </ul>
        </div>
    );
};

const ProjectDetail: FC<{ project: Project; onClose: () => void; onEdit: () => void; onDelete: () => void; refreshGlobal: () => void; }> = ({ project: initialProject, onClose, onEdit, onDelete, refreshGlobal }) => {
    const { currentUser, checkPermission } = useAppContext();
    const canEdit = checkPermission('can_edit_project');
    const canDelete = checkPermission('can_delete_project');

    // Use local state for immediate UI updates
    const [currentProject, setCurrentProject] = useState<Project>(initialProject);

    useEffect(() => {
        setCurrentProject(initialProject);
    }, [initialProject]);

    // Helper to save project changes to Supabase and local state
    const saveProjectChanges = async (patch: Partial<Project>) => {
        try {
            // 1. Optimistic UI Update
            const updated = { ...currentProject, ...patch };
            setCurrentProject(updated);

            // 2. Persist to DB
            const { error } = await supabase.from('projects').update(patch).eq('id', currentProject.id);
            if (error) throw error;

            // 3. Trigger global refresh in background to keep other components in sync
            refreshGlobal();
        } catch (e) {
            console.error("Failed to update project:", e);
            alert("Failed to save changes.");
            // Revert state if needed (optional implementation)
        }
    };

    const handleUpdateTask = (updatedTask: Task) => {
        const newTasks = (currentProject.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t);
        
        // Recalculate Project Stats
        const completedTasks = newTasks.filter(t => t.status === TaskStatus.Completed);
        const completionPercentage = newTasks.length > 0 
            ? Math.round((completedTasks.length / newTasks.length) * 100) 
            : 0;
            
        const spent = newTasks.reduce((acc, t) => acc + (t.completionDetails?.actualCost || 0), 0);

        saveProjectChanges({ 
            tasks: newTasks, 
            spent, 
            completionPercentage,
            status: completionPercentage === 100 && currentProject.status === ProjectStatus.InProgress ? ProjectStatus.Completed : currentProject.status 
        });

        // Notifications & Logging
        if (updatedTask.status === TaskStatus.Completed && updatedTask.status !== currentProject.tasks.find(t => t.id === updatedTask.id)?.status) {
            logActivity('Completed Task', `${updatedTask.name} in ${currentProject.title}`, currentUser);
            if (currentProject.teamLeader.id && currentUser?.id !== currentProject.teamLeader.id) {
                createNotification({ 
                    userId: currentProject.teamLeader.id, 
                    title: 'Task Completed', 
                    message: `${updatedTask.name} completed by ${currentUser?.name}.`, 
                    type: NotificationType.TaskUpdate, 
                    priority: NotificationPriority.Medium,
                    link: `/projects/${currentProject.id}`
                });
            }
        }
    };

    const handleAddTask = (name: string) => {
        const newTask: Task = { 
            id: `t-${Date.now()}`, 
            name, 
            description: '', 
            assignedTo: currentProject.teamLeader, // Default to Project Manager
            status: TaskStatus.Pending,
            estimatedCost: 0
        };
        
        const newTasks = [...(currentProject.tasks || []), newTask];
        
        // Recalculate Percentage (Budget doesn't change on add, but % does)
        const completedTasks = newTasks.filter(t => t.status === TaskStatus.Completed);
        const completionPercentage = newTasks.length > 0 
            ? Math.round((completedTasks.length / newTasks.length) * 100) 
            : 0;

        saveProjectChanges({ tasks: newTasks, completionPercentage });
        logActivity('Added Task', `${name} to ${currentProject.title}`, currentUser);
    };

    const handleDeleteTask = (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete task "${name}"?`)) return;

        const newTasks = (currentProject.tasks || []).filter(t => t.id !== id);
        
        // Recalculate Stats
        const completedTasks = newTasks.filter(t => t.status === TaskStatus.Completed);
        const completionPercentage = newTasks.length > 0 
            ? Math.round((completedTasks.length / newTasks.length) * 100) 
            : 0;
            
        const spent = newTasks.reduce((acc, t) => acc + (t.completionDetails?.actualCost || 0), 0);

        saveProjectChanges({ tasks: newTasks, spent, completionPercentage });
        logActivity('Deleted Task', `${name} from ${currentProject.title}`, currentUser);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <button onClick={onClose} className="text-brand-primary hover:underline flex items-center gap-2 font-medium"><ArrowLeftIcon /> Back to Projects</button>
                <div className="flex gap-2">
                    {canEdit && <button onClick={onEdit} className="bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow transition-colors"><PencilIcon className="w-4 h-4"/> Edit Project</button>}
                    {canDelete && <button onClick={onDelete} className="bg-red-600 text-white py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-red-700 shadow transition-colors"><TrashIcon className="w-4 h-4"/> Delete</button>}
                </div>
            </div>
            <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800 border-l-4 border-brand-primary">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold dark:text-white">{currentProject.title}</h2>
                            <StatusBadge status={currentProject.status} />
                        </div>
                        {currentProject.rejectionReason && currentProject.status === ProjectStatus.Rejected && (
                             <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">
                                <strong>Rejection Reason:</strong> {currentProject.rejectionReason}
                            </div>
                        )}
                        <p className="text-base-content-secondary mt-2 dark:text-gray-400 max-w-2xl">{currentProject.description}</p>

                        <div className="flex flex-wrap items-center gap-4 mt-4">
                            {(currentProject.status === ProjectStatus.InProgress || currentProject.status === ProjectStatus.OnHold) && (
                                <button onClick={() => saveProjectChanges({ status: currentProject.status === 'In Progress' ? ProjectStatus.OnHold : ProjectStatus.InProgress })} className="flex items-center gap-1 text-sm bg-base-200 px-3 py-1.5 rounded-md hover:bg-base-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-colors border border-base-300 dark:border-gray-600">
                                    {currentProject.status === 'In Progress' ? <PauseIcon className="w-4 h-4"/> : <PlayIcon className="w-4 h-4"/>} 
                                    {currentProject.status === 'In Progress' ? 'Hold Project' : 'Resume Project'}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="text-right bg-base-200 p-4 rounded-lg dark:bg-gray-700/50 min-w-[200px]">
                        <p className="text-sm text-base-content-secondary dark:text-gray-400 mb-1">Budget Utilization</p>
                        <p className="text-2xl font-bold dark:text-white">{formatCurrency(currentProject.spent)} <span className="text-sm font-normal text-gray-500">/ {formatCurrency(currentProject.budget)}</span></p>
                        <div className="mt-3 w-full bg-gray-300 rounded-full h-2 dark:bg-gray-600">
                            <div 
                                className={`h-2 rounded-full transition-all duration-500 ${currentProject.spent > currentProject.budget ? 'bg-red-500' : 'bg-brand-primary'}`} 
                                style={{ width: `${Math.min((currentProject.spent / (currentProject.budget || 1)) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-right mt-1 text-gray-500">{((currentProject.spent / (currentProject.budget || 1)) * 100).toFixed(0)}% Used</p>
                    </div>
                </div>
                
                <div className="mt-6">
                     <div className="flex justify-between text-sm mb-1 font-semibold text-base-content-secondary dark:text-gray-400">
                        <span>Project Completion</span>
                        <span>{currentProject.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-3 dark:bg-gray-700">
                        <div className="bg-green-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${currentProject.completionPercentage}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <TaskList project={currentProject} onUpdateTask={handleUpdateTask} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} />
                    <DocumentsList project={currentProject} onUpdateProject={saveProjectChanges} currentUser={currentUser!} />
                </div>
                <div className="space-y-6">
                     <div className="bg-base-100 p-6 rounded-xl shadow-md space-y-4 dark:bg-gray-800">
                        <h3 className="font-bold text-lg border-b pb-2 dark:border-gray-700 dark:text-white">Project Details</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div><p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Project Manager</p><p className="dark:text-white flex items-center gap-2"><Avatar name={currentProject.teamLeader.name} size="sm"/> {currentProject.teamLeader.name}</p></div>
                            <div><p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Due Date</p><p className="dark:text-white">{new Date(currentProject.endDate).toLocaleDateString()}</p></div>
                            <div>
                                <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Team Members</p>
                                <div className="flex -space-x-2 mt-2">
                                    {currentProject.team.map(m => <Avatar key={m.id} name={m.name} size="sm" className="border-2 border-white dark:border-gray-800" />)}
                                    {currentProject.team.length === 0 && <span className="text-sm text-gray-400">No team assigned</span>}
                                </div>
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Tags</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {currentProject.tags?.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full dark:bg-gray-700 dark:text-gray-300">#{tag}</span>
                                    ))}
                                    {(!currentProject.tags || currentProject.tags.length === 0) && <span className="text-sm text-gray-400">-</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectsPage: React.FC = () => {
    const { projects, users, currentUser, refreshData, checkPermission } = useAppContext();
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | undefined>(undefined);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'title', direction: 'ascending' });

    if (!currentUser) return null;

    const isAdmin = currentUser.role === UserRole.Admin;
    const canCreate = checkPermission('can_create_project');
    const canDelete = checkPermission('can_delete_project');

    const visibleProjects = useMemo(() => isAdmin ? projects : projects.filter(p => p.isAccessEnabled !== false), [projects, isAdmin]);
    
    // Find the full project object based on ID
    const selectedProject = visibleProjects.find(p => p.id === selectedProjectId);

    const sortedProjects = useMemo(() => {
        let list = [...visibleProjects];
        if (sortConfig) {
            list.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof Project] || '';
                const bVal = b[sortConfig.key as keyof Project] || '';
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [visibleProjects, sortConfig]);

    const handleSave = async (data: NewProjectData) => {
        try {
            if (projectToEdit?.id) {
                // Update Existing Project
                const { error } = await supabase.from('projects').update({ 
                    title: data.title,
                    description: data.description,
                    endDate: data.endDate,
                    teamLeader: data.teamLeader,
                    tags: data.tags,
                    budget: data.budget
                }).eq('id', projectToEdit.id);

                if (error) throw error;
                logActivity('Updated Project', data.title, currentUser);
            } else {
                // Create New Project
                const newProject = { 
                    ...data, 
                    status: ProjectStatus.Pending, 
                    completionPercentage: 0, 
                    spent: 0, 
                    tasks: [], 
                    documents: [], 
                    team: [data.teamLeader], 
                    startDate: new Date().toISOString().split('T')[0], 
                    isAccessEnabled: true 
                };
                
                const { error } = await supabase.from('projects').insert([newProject]);
                if (error) throw error;

                logActivity('Created Project', data.title, currentUser);
                
                const admins = users.filter(u => u.role === UserRole.Admin);
                for(const admin of admins) {
                    if(admin.id) await createNotification({ userId: admin.id, title: 'New Project Approval', message: `${data.title} needs approval.`, type: NotificationType.ApprovalRequest, priority: NotificationPriority.High, link: '/financials' });
                }
            }
            setIsModalOpen(false);
            setProjectToEdit(undefined); // Clear edit state
            refreshData();
        } catch (e) { 
            console.error(e); 
            alert('Save failed: ' + (e as Error).message); 
        }
    };

    const handleDelete = async (p: Project) => {
        if (!confirm(`Are you sure you want to delete project "${p.title}"? This action cannot be undone.`)) return;
        
        try {
            const { error } = await supabase.from('projects').delete().eq('id', p.id);
            if (error) throw error;

            logActivity('Deleted Project', p.title, currentUser);
            
            // If deleting from details view, close it
            if (selectedProjectId === p.id) {
                setSelectedProjectId(null);
            }
            refreshData();
        } catch (e) {
            console.error(e);
            alert("Delete failed: " + (e as Error).message);
        }
    };

    return (
        <>
            {selectedProject ? (
                <ProjectDetail 
                    project={selectedProject} 
                    onClose={() => setSelectedProjectId(null)} 
                    onEdit={() => { setProjectToEdit(selectedProject); setIsModalOpen(true); }} 
                    onDelete={() => handleDelete(selectedProject)} 
                    refreshGlobal={refreshData} 
                />
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold dark:text-white">Projects</h2>
                        {canCreate && <button onClick={() => { setProjectToEdit(undefined); setIsModalOpen(true); }} className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">+ New Project</button>}
                    </div>
                    <ProjectsTable 
                        projects={sortedProjects} 
                        onViewProject={setSelectedProjectId} 
                        sortConfig={sortConfig} 
                        requestSort={(key) => setSortConfig(prev => prev?.key === key && prev.direction === 'ascending' ? { key, direction: 'descending' } : { key, direction: 'ascending' })} 
                        currentUser={currentUser} 
                        canDelete={!!canDelete} 
                        onDeleteProject={handleDelete} 
                    />
                </div>
            )}
            
            <CreateProjectModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setProjectToEdit(undefined); }} 
                onSave={handleSave} 
                users={users} 
                initialData={projectToEdit} 
            />
        </>
    );
};

export default ProjectsPage;
