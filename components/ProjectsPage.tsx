
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
        [ProjectStatus.InProgress]: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20',
        [ProjectStatus.Completed]: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300',
        [ProjectStatus.OnHold]: 'bg-brand-secondary/20 text-brand-primary border border-brand-secondary/30',
        [ProjectStatus.Pending]: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-200',
        [ProjectStatus.Rejected]: 'bg-brand-tertiary/10 text-brand-tertiary border border-brand-tertiary/20',
    };
    return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${colorMap[status] || 'bg-gray-100'}`}>{status}</span>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-base-100 rounded-2xl shadow-2xl p-6 w-full max-w-md dark:bg-gray-800 border border-base-300 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-6 dark:text-white">Edit Task</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Task Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-4 py-2.5 border border-base-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assign To</label>
                        <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="mt-1 block w-full px-4 py-2.5 border border-base-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all">
                            {projectMembers.map(u => <option key={u.id} value={u.id!}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Deadline</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-1 block w-full px-4 py-2.5 border border-base-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:[color-scheme:dark] focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Estimated Cost</label>
                        <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(Number(e.target.value))} min="0" className="mt-1 block w-full px-4 py-2.5 border border-base-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
                    </div>
                    <div className="flex justify-end gap-3 pt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-base-200 text-base-content hover:bg-base-300 dark:bg-gray-700 dark:text-white transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-sm bg-brand-primary text-white shadow-lg hover:brightness-110 transition-all">Save Changes</button>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-base-100 rounded-2xl shadow-2xl p-6 w-full max-w-md dark:bg-gray-800 border border-base-300 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-2 dark:text-white">Complete Task</h3>
                <p className="text-sm text-gray-500 mb-6">{task.name}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Actual Cost ($)</label>
                        <input type="number" value={actualCost} onChange={e => setActualCost(Number(e.target.value))} required min="0" className="mt-1 block w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} required className="mt-1 block w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all">
                            {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description / Notes</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional notes..." className="mt-1 block w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
                    </div>
                    <div className="flex justify-end gap-3 pt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-base-200 text-base-content hover:bg-base-300 dark:bg-gray-700 dark:text-white transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-sm bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all">Confirm Completion</button>
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
    
    const isLocked = project.status === ProjectStatus.Pending || project.status === ProjectStatus.Rejected;

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
        <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6 text-brand-primary"/> Tasks
            </h3>
            {isLocked && (
                <div className={`text-center py-3 mb-6 rounded-xl text-sm font-bold border ${project.status === ProjectStatus.Rejected ? 'bg-brand-tertiary/10 text-brand-tertiary border-brand-tertiary/20' : 'bg-brand-secondary/10 text-brand-primary border-brand-secondary/20'}`}>
                    Project is {project.status}. Tasks are locked.
                </div>
            )}
            
            <ul className="space-y-3">
                {(project.tasks || []).map(task => {
                    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== TaskStatus.Completed;
                    const isCompleted = task.status === TaskStatus.Completed;

                    return (
                        <li key={task.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-2xl transition-all gap-4 group ${isCompleted ? 'bg-green-50/30 border-green-100 dark:bg-green-900/10 dark:border-green-800/30' : 'bg-base-100 border-base-200 dark:bg-gray-800/50 dark:border-gray-700 hover:border-brand-primary/30'}`}>
                            <div className="flex items-start gap-4 flex-1">
                                <div className="mt-1">
                                    <StatusBadge status={task.status} />
                                </div>
                                <div>
                                    <h4 className={`font-bold text-base-content dark:text-white ${isCompleted ? 'opacity-60' : ''}`}>{task.name}</h4>
                                    
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Avatar name={task.assignedTo?.name || '?'} size="sm" className="w-5 h-5 text-[8px]" /> 
                                            <span>{task.assignedTo?.name}</span>
                                        </div>
                                        
                                        {task.deadline && (
                                            <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-brand-tertiary' : ''}`}>
                                                <CalendarIcon className="w-4 h-4" /> 
                                                <span>{new Date(task.deadline).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        
                                        {(task.estimatedCost || 0) > 0 && (
                                            <div className="flex items-center gap-1">
                                                <span className="bg-base-200 dark:bg-gray-700 px-2 py-0.5 rounded">EST: {formatCurrency(task.estimatedCost || 0)}</span>
                                            </div>
                                        )}

                                        {isCompleted && task.completionDetails && (
                                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <CheckIcon className="w-4 h-4"/>
                                                <span>ACTUAL: {formatCurrency(task.completionDetails.actualCost)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                {task.status !== TaskStatus.Completed && canManageTasks && !isLocked && (
                                    <button 
                                        onClick={() => setTaskToComplete(task)} 
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                                    >
                                        <CheckIcon className="w-4 h-4"/> Complete
                                    </button>
                                )}
                                
                                {canManageTasks && !isLocked && (
                                    <div className="flex gap-1">
                                        <button onClick={() => setTaskToEdit(task)} className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all" title="Edit Task">
                                            <PencilIcon className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => onDeleteTask(task.id, task.name)} className="p-2 text-gray-400 hover:text-brand-tertiary hover:bg-brand-tertiary/10 rounded-xl transition-all" title="Delete Task">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
                {(project.tasks || []).length === 0 && (
                    <li className="text-center text-gray-400 text-sm py-12 border-2 border-dashed border-base-300 rounded-2xl dark:border-gray-700">No tasks added yet.</li>
                )}
            </ul>

            {canManageTasks && !isLocked && (
                <form onSubmit={e => { e.preventDefault(); if(newTaskName.trim()) { onAddTask(newTaskName.trim()); setNewTaskName(''); } }} className="mt-8 flex gap-3">
                    <div className="relative flex-grow">
                        <PlusIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input 
                            type="text" 
                            value={newTaskName} 
                            onChange={e => setNewTaskName(e.target.value)} 
                            placeholder="Add a new task..." 
                            className="w-full pl-12 pr-4 py-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-base-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all shadow-sm" 
                        />
                    </div>
                    <button type="submit" className="bg-brand-primary text-white py-3 px-8 rounded-xl hover:brightness-110 transition-all shadow-lg font-bold">Add</button>
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
        if (mime.startsWith('image/')) return <PhotographIcon className="w-5 h-5 text-brand-primary" />;
        if (mime === 'application/pdf') return <FilePdfIcon className="w-5 h-5 text-brand-tertiary" />;
        return <PaperclipIcon className="w-5 h-5 text-gray-400" />;
    };

    return (
        <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                    <FolderIcon className="w-6 h-6 text-brand-primary"/> Documents
                </h3>
                {canUpload && (
                    <>
                        <label htmlFor="doc-upload" className="cursor-pointer text-brand-primary flex items-center gap-2 hover:bg-brand-primary/10 transition-all font-bold text-sm bg-brand-primary/5 px-4 py-2 rounded-xl">
                            <PlusIcon className="w-5 h-5"/> Upload
                        </label>
                        <input id="doc-upload" type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" disabled={uploading} />
                    </>
                )}
            </div>
            {uploading && <div className="text-xs font-bold text-brand-primary animate-pulse mb-4">UPLOADING FILE...</div>}
            
            {isRejected && !isAdmin && (
                <div className="mb-6 p-3 bg-brand-tertiary/10 text-brand-tertiary text-xs font-bold rounded-xl border border-brand-tertiary/20 uppercase tracking-wider">
                    Project is rejected. Document uploads are restricted.
                </div>
            )}

            <ul className="space-y-2">
                {(project.documents || []).map(doc => (
                    <li key={doc.id} className="flex justify-between items-center p-3.5 bg-base-200/50 rounded-2xl dark:bg-gray-700/30 hover:bg-base-300/50 transition-all group">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {getIcon(doc.type)}
                            <div className="flex flex-col min-w-0">
                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-bold truncate hover:text-brand-primary transition-colors dark:text-gray-100">{doc.name}</a>
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">BY {doc.uploadedBy.name} • {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        {canUpload && (
                            <button onClick={() => handleDelete(doc)} className="text-gray-400 hover:text-brand-tertiary transition-all p-2 hover:bg-brand-tertiary/10 rounded-xl">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        )}
                    </li>
                ))}
                {(project.documents || []).length === 0 && (
                     <li className="text-center text-gray-400 text-sm py-12 border-2 border-dashed border-base-300 rounded-2xl dark:border-gray-700">No documents attached.</li>
                )}
            </ul>
        </div>
    );
};

const ProjectDetail: FC<{ project: Project; onClose: () => void; onEdit: () => void; onDelete: (p: Project) => void; refreshGlobal: () => void; }> = ({ project: initialProject, onClose, onEdit, onDelete, refreshGlobal }) => {
    const { currentUser, checkPermission } = useAppContext();
    const canEdit = checkPermission('can_edit_project');
    const canDelete = checkPermission('can_delete_project');

    const [currentProject, setCurrentProject] = useState<Project>(initialProject);

    useEffect(() => {
        setCurrentProject(initialProject);
    }, [initialProject]);

    const saveProjectChanges = async (patch: Partial<Project>) => {
        try {
            const updated = { ...currentProject, ...patch };
            setCurrentProject(updated);

            const { error } = await supabase.from('projects').update(patch).eq('id', currentProject.id);
            if (error) throw error;

            refreshGlobal();
        } catch (e) {
            console.error("Failed to update project:", e);
            alert("Failed to save changes.");
        }
    };

    const handleUpdateTask = (updatedTask: Task) => {
        const newTasks = (currentProject.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t);
        
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
            assignedTo: currentProject.teamLeader,
            status: TaskStatus.Pending,
            estimatedCost: 0
        };
        const newTasks = [...(currentProject.tasks || []), newTask];
        const completionPercentage = newTasks.length > 0 
            ? Math.round((newTasks.filter(t => t.status === TaskStatus.Completed).length / newTasks.length) * 100) 
            : 0;

        saveProjectChanges({ tasks: newTasks, completionPercentage });
        logActivity('Added Task', `${name} to ${currentProject.title}`, currentUser);
    };

    const handleDeleteTask = (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete task "${name}"?`)) return;
        const newTasks = (currentProject.tasks || []).filter(t => t.id !== id);
        const completionPercentage = newTasks.length > 0 
            ? Math.round((newTasks.filter(t => t.status === TaskStatus.Completed).length / newTasks.length) * 100) 
            : 0;
        const spent = newTasks.reduce((acc, t) => acc + (t.completionDetails?.actualCost || 0), 0);

        saveProjectChanges({ tasks: newTasks, spent, completionPercentage });
        logActivity('Deleted Task', `${name} from ${currentProject.title}`, currentUser);
    };

    // Determine header accent color strictly
    const getAccentColor = () => {
        if (currentProject.status === ProjectStatus.Completed) return 'border-green-500';
        if (currentProject.status === ProjectStatus.Rejected) return 'border-brand-tertiary';
        return 'border-brand-primary';
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            <div className="flex justify-between items-center">
                <button onClick={onClose} className="text-brand-primary hover:text-brand-dark flex items-center gap-2 font-bold text-sm uppercase tracking-widest transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" /> Back to Projects
                </button>
                <div className="flex gap-2">
                    {canEdit && (
                        <button onClick={onEdit} className="bg-base-100 text-gray-700 py-2.5 px-5 rounded-xl flex items-center gap-2 hover:bg-base-200 shadow-sm border border-base-300 font-bold text-sm transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <PencilIcon className="w-4 h-4 text-brand-primary"/> Edit Project
                        </button>
                    )}
                    {canDelete && (
                        <button onClick={() => onDelete(currentProject)} className="bg-brand-tertiary text-white py-2.5 px-5 rounded-xl flex items-center gap-2 hover:brightness-110 shadow-lg font-bold text-sm transition-all">
                            <TrashIcon className="w-4 h-4"/> Delete
                        </button>
                    )}
                </div>
            </div>

            <div className={`bg-base-100 p-8 rounded-2xl shadow-sm dark:bg-gray-800 border-l-[6px] ${getAccentColor()}`}>
                <div className="flex flex-col lg:flex-row justify-between gap-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h2 className="text-4xl font-bold dark:text-white">{currentProject.title}</h2>
                            <StatusBadge status={currentProject.status} />
                        </div>
                        {currentProject.rejectionReason && currentProject.status === ProjectStatus.Rejected && (
                             <div className="mt-4 p-4 bg-brand-tertiary/5 border border-brand-tertiary/10 text-brand-tertiary rounded-2xl">
                                <strong className="text-xs uppercase tracking-widest block mb-1">Rejection Reason:</strong> 
                                <span className="text-sm font-medium">{currentProject.rejectionReason}</span>
                            </div>
                        )}
                        <p className="text-gray-500 mt-4 dark:text-gray-400 max-w-3xl leading-relaxed">{currentProject.description}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-6">
                            {(currentProject.status === ProjectStatus.InProgress || currentProject.status === ProjectStatus.OnHold) && (
                                <button onClick={() => saveProjectChanges({ status: currentProject.status === 'In Progress' ? ProjectStatus.OnHold : ProjectStatus.InProgress })} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-base-200 px-4 py-2.5 rounded-xl hover:bg-base-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-all border border-base-300 dark:border-gray-600">
                                    {currentProject.status === 'In Progress' ? <PauseIcon className="w-4 h-4 text-brand-primary"/> : <PlayIcon className="w-4 h-4 text-brand-primary"/>} 
                                    {currentProject.status === 'In Progress' ? 'Hold Project' : 'Resume Project'}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="text-right bg-base-200/50 p-6 rounded-2xl dark:bg-gray-700/30 min-w-[280px] border border-base-300 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Budget Utilization</p>
                        <p className="text-3xl font-bold dark:text-white mb-4">
                            {formatCurrency(currentProject.spent)} 
                            <span className="text-sm font-bold text-gray-400 ml-1">/ {formatCurrency(currentProject.budget)}</span>
                        </p>
                        <div className="w-full bg-base-300 rounded-full h-2.5 dark:bg-gray-600 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-700 ${currentProject.spent > currentProject.budget ? 'bg-brand-tertiary' : 'bg-brand-primary'}`} 
                                style={{ width: `${Math.min((currentProject.spent / (currentProject.budget || 1)) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2">
                             <span className="text-[10px] font-bold text-gray-400 uppercase">Utilized</span>
                             <span className={`text-[10px] font-bold uppercase ${currentProject.spent > currentProject.budget ? 'text-brand-tertiary' : 'text-brand-primary'}`}>
                                {((currentProject.spent / (currentProject.budget || 1)) * 100).toFixed(0)}%
                             </span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-10 pt-8 border-t border-base-200 dark:border-gray-700">
                     <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-3 text-gray-500">
                        <span>Project Completion</span>
                        <span className="text-brand-primary">{currentProject.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-3 dark:bg-gray-700 overflow-hidden shadow-inner">
                        <div className="bg-green-500 h-full rounded-full transition-all duration-1000 shadow-lg" style={{ width: `${currentProject.completionPercentage}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <TaskList project={currentProject} onUpdateTask={handleUpdateTask} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} />
                    <DocumentsList project={currentProject} onUpdateProject={saveProjectChanges} currentUser={currentUser!} />
                </div>
                <div className="space-y-6">
                     <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 dark:bg-gray-800 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-6 border-b border-base-200 pb-4 dark:border-gray-700 dark:text-white uppercase tracking-wider">Project Audit</h3>
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Team Leader</p>
                                <div className="flex items-center gap-3">
                                    <Avatar name={currentProject.teamLeader.name} size="md"/>
                                    <span className="font-bold text-sm dark:text-white">{currentProject.teamLeader.name}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Target Deadline</p>
                                <div className="flex items-center gap-2 font-bold text-sm dark:text-white">
                                    <CalendarIcon className="w-5 h-5 text-brand-primary" />
                                    {new Date(currentProject.endDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Collaborators</p>
                                <div className="flex flex-wrap gap-2">
                                    {currentProject.team.map(m => (
                                        <div key={m.id} className="flex items-center gap-2 bg-base-200 dark:bg-gray-700 px-2 py-1.5 rounded-xl border border-base-300 dark:border-gray-600">
                                            <Avatar name={m.name} size="sm" className="w-6 h-6 text-[10px]" />
                                            <span className="text-xs font-bold truncate max-w-[80px]">{m.name.split(' ')[0]}</span>
                                        </div>
                                    ))}
                                    {currentProject.team.length === 0 && <span className="text-xs font-bold text-gray-400">NO TEAM ASSIGNED</span>}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Metadata Tags</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {currentProject.tags?.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-brand-primary/5 text-brand-primary text-[10px] font-bold uppercase rounded-lg border border-brand-primary/10">#{tag}</span>
                                    ))}
                                    {(!currentProject.tags || currentProject.tags.length === 0) && <span className="text-xs font-bold text-gray-400">N/A</span>}
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
            setProjectToEdit(undefined);
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
            
            // Critical: If we are in the detail view, close it
            if (selectedProjectId === p.id) {
                setSelectedProjectId(null);
            }
            
            // Refresh global state
            await refreshData();
        } catch (e) {
            console.error(e);
            alert("Delete failed: " + (e as Error).message);
        }
    };

    return (
        <div className="w-full">
            {selectedProject ? (
                <ProjectDetail 
                    project={selectedProject} 
                    onClose={() => setSelectedProjectId(null)} 
                    onEdit={() => { setProjectToEdit(selectedProject); setIsModalOpen(true); }} 
                    onDelete={handleDelete} 
                    refreshGlobal={refreshData} 
                />
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center px-1">
                        <div>
                            <h2 className="text-4xl font-bold dark:text-white">Projects</h2>
                            <p className="text-gray-500 text-sm mt-1 dark:text-gray-400">Manage and track organizational initiatives.</p>
                        </div>
                        {canCreate && (
                            <button onClick={() => { setProjectToEdit(undefined); setIsModalOpen(true); }} className="bg-brand-primary text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:brightness-110 transition-all">
                                + New Project
                            </button>
                        )}
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
        </div>
    );
};

export default ProjectsPage;
