
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Project, ProjectStatus, TaskStatus, UserRole, Task, Document, ExpenseCategory } from '../../types';
import { useAppContext } from '../../AppContext';
import ProjectsTable from './ProjectsTable';
import CreateProjectModal from './CreateProjectModal';
import { 
    ArrowLeftIcon, PlusIcon, FolderIcon, ClockIcon, CheckCircleIcon, 
    FinanceIcon, UserGroupIcon, CalendarIcon, XIcon, PaperclipIcon, 
    CheckIcon, PencilIcon, TrashIcon, PauseIcon, PlayIcon, 
    DocumentTextIcon, PhotographIcon, InformationCircleIcon 
} from '../IconComponents';
import Avatar from '../Avatar';
import { logActivity } from '../../services/activityLogger';

/* -------------------------------------------------------------------------- */
/*                                HELPERS                                     */
/* -------------------------------------------------------------------------- */

const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const getDeadlineStatus = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `Overdue by ${Math.abs(diffDays)}d`, color: 'text-brand-tertiary', bgColor: 'bg-brand-tertiary/10' };
    if (diffDays === 0) return { label: 'Due Today', color: 'text-brand-tertiary', bgColor: 'bg-brand-tertiary/10' };
    if (diffDays <= 7) return { label: `${diffDays}d remaining`, color: 'text-brand-secondary', bgColor: 'bg-brand-secondary/10' };
    return { label: `${diffDays}d remaining`, color: 'text-green-600', bgColor: 'bg-green-500/10' };
};

const StatusBadge: React.FC<{ status: ProjectStatus | TaskStatus }> = ({ status }) => {
    const colorMap: Record<string, string> = {
        [ProjectStatus.InProgress]: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20',
        [ProjectStatus.Completed]: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300',
        [ProjectStatus.OnHold]: 'bg-brand-secondary/20 text-brand-secondary-content border border-brand-secondary/30 dark:text-brand-secondary',
        [ProjectStatus.Pending]: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-200',
        [ProjectStatus.Rejected]: 'bg-brand-tertiary/10 text-brand-tertiary border border-brand-tertiary/20',
    };
    const statusKey = status === TaskStatus.Completed ? ProjectStatus.Completed : status;
    return <span className={`px-2.5 py-0.5 inline-flex text-[10px] uppercase tracking-widest leading-5 font-bold rounded-full border ${colorMap[statusKey as string] || 'bg-gray-100'}`}>{status}</span>
};

/* -------------------------------------------------------------------------- */
/*                                COMPONENTS                                  */
/* -------------------------------------------------------------------------- */

const DocumentPreview: React.FC<{ doc: Document }> = ({ doc }) => {
    const isImage = doc.type.startsWith('image/');
    const isPdf = doc.type.includes('pdf');

    return (
        <div className="flex items-center gap-3 p-3 bg-base-200/50 dark:bg-white/5 rounded-xl border border-base-300 dark:border-white/5 hover:border-brand-primary/30 transition-all group overflow-hidden">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-base-100 dark:bg-black/40 border border-base-300 dark:border-white/10 flex items-center justify-center overflow-hidden">
                {isImage ? (
                    <img src={doc.url} alt={doc.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                ) : isPdf ? (
                    <DocumentTextIcon className="w-5 h-5 text-brand-tertiary" />
                ) : (
                    <PaperclipIcon className="w-5 h-5 text-gray-400" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold dark:text-white truncate group-hover:text-brand-primary transition-colors">{doc.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[8px] text-gray-500 uppercase font-bold tracking-widest">
                    <span>{doc.uploadedBy.name}</span>
                    <span>•</span>
                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                </div>
            </div>
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-brand-primary transition-colors">
                <InformationCircleIcon className="w-4 h-4" />
            </a>
        </div>
    );
};

const ProjectsPage: React.FC = () => {
    const { projects, users, currentUser, refreshData } = useAppContext();
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    
    // Per-Task UI States
    const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [costInputs, setCostInputs] = useState<Record<string, string>>({});
    const [nameEditInputs, setNameEditInputs] = useState<Record<string, string>>({});

    const [newTaskName, setNewTaskName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // RBAC Helpers
    const isAdminOrPM = currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.ProjectManager;

    // Handle deep navigation
    useEffect(() => {
        const nextId = (window as any).nextProjectIdToOpen;
        if (nextId) {
            const project = projects.find(p => p.id === nextId);
            if (project) {
                setSelectedProject(project);
                (window as any).nextProjectIdToOpen = null;
            }
        }
    }, [projects]);

    // Keep state in sync with global data
    useEffect(() => {
        if (selectedProject) {
            const updated = projects.find(p => p.id === selectedProject.id);
            if (updated) setSelectedProject(updated);
        }
    }, [projects, selectedProject]);

    const calculateProjectMetrics = (tasks: Task[]) => {
        const spent = tasks.reduce((acc, t) => acc + (t.completionDetails?.actualCost || 0), 0);
        const completedCount = tasks.filter(t => t.status === TaskStatus.Completed).length;
        const completionPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
        return { spent, completionPercentage: Math.min(completionPercentage, 100) };
    };

    const persistProjectUpdates = async (updates: Partial<Project>, action: string, detail: string) => {
        if (!selectedProject) return;
        const { error } = await supabase.from('projects').update(updates).eq('id', selectedProject.id);
        if (!error) {
            logActivity(action, `${detail} in ${selectedProject.title}`);
            refreshData();
        } else {
            alert(`Operational Error: ${error.message}`);
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !newTaskName.trim() || !currentUser) return;

        const newTask: Task = {
            id: generateId(),
            name: newTaskName.trim(),
            description: '',
            assignedTo: currentUser,
            status: TaskStatus.Pending,
            estimatedCost: 0,
        };

        const updatedTasks = [...(selectedProject.tasks || []), newTask];
        const { spent, completionPercentage } = calculateProjectMetrics(updatedTasks);
        await persistProjectUpdates({ tasks: updatedTasks, spent, completionPercentage }, 'Task Deployment', newTask.name);
        setIsAddTaskOpen(false);
        setNewTaskName('');
    };

    const handleRenameTask = async (taskId: string) => {
        const newName = nameEditInputs[taskId];
        if (!selectedProject || !newName?.trim()) return;

        const task = selectedProject.tasks?.find(t => t.id === taskId);
        const isCompleted = task?.status === TaskStatus.Completed;
        
        if (isCompleted && !isAdminOrPM) {
            alert("Authorization Failure: Restricted modification of finalized items.");
            return;
        }

        const updatedTasks = (selectedProject.tasks || []).map(t => 
            t.id === taskId ? { ...t, name: newName.trim() } : t
        );

        await persistProjectUpdates({ tasks: updatedTasks }, 'Registry Update', `Renamed task to ${newName}`);
        setEditingTaskId(null);
    };

    const handleDeleteTask = async (taskId: string, taskName: string) => {
        if (!selectedProject) return;
        const task = selectedProject.tasks?.find(t => t.id === taskId);
        const isCompleted = task?.status === TaskStatus.Completed;

        if (isCompleted && !isAdminOrPM) {
            alert("Authorization Failure: Only Authority Leads can purge finalized tasks.");
            return;
        }

        if (!confirm(`Purge task "${taskName}" from operational registry? This action is irreversible.`)) return;

        const updatedTasks = (selectedProject.tasks || []).filter(t => t.id !== taskId);
        const { spent, completionPercentage } = calculateProjectMetrics(updatedTasks);
        await persistProjectUpdates({ tasks: updatedTasks, spent, completionPercentage }, 'Operational Purge', taskName);
    };

    const handleCompleteTask = async (taskId: string) => {
        const costStr = costInputs[taskId];
        if (!selectedProject || !costStr) return;

        const actualCost = parseFloat(costStr);
        if (isNaN(actualCost) || actualCost < 0) {
            alert("Protocol Violation: Actual consumption must be a valid non-negative numeral.");
            return;
        }

        const updatedTasks = (selectedProject.tasks || []).map(t => {
            if (t.id === taskId) {
                return {
                    ...t,
                    status: TaskStatus.Completed,
                    completionDetails: {
                        description: 'Operational Finalization',
                        category: ExpenseCategory.Miscellaneous,
                        actualCost: actualCost,
                        completedAt: new Date().toISOString()
                    }
                };
            }
            return t;
        });

        const { spent, completionPercentage } = calculateProjectMetrics(updatedTasks);
        await persistProjectUpdates({ tasks: updatedTasks, spent, completionPercentage }, 'Task Finalization', `Incurred cost: ${formatCurrency(actualCost)}`);
        setCompletingTaskId(null);
    };

    const handleHoldProject = async () => {
        if (!isAdminOrPM) return;
        await persistProjectUpdates({ status: ProjectStatus.OnHold }, 'Project Suspension', 'Status changed to ON HOLD');
    };

    const handleResumeProject = async () => {
        if (!isAdminOrPM) return;
        await persistProjectUpdates({ status: ProjectStatus.InProgress }, 'Project Activation', 'Status resumed to IN PROGRESS');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProject || !currentUser) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${selectedProject.id}/${generateId()}.${fileExt}`;
            const filePath = `documents/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('projects').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('projects').getPublicUrl(filePath);

            const newDoc: Document = {
                id: filePath,
                name: file.name,
                url: publicUrl,
                type: file.type,
                uploadedAt: new Date().toISOString(),
                uploadedBy: { id: currentUser.id!, name: currentUser.name }
            };

            const updatedDocs = [...(selectedProject.documents || []), newDoc];
            await persistProjectUpdates({ documents: updatedDocs }, 'Asset Archival', file.name);
        } catch (error: any) {
            alert("Archival Error: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const filteredProjects = useMemo(() => {
        return projects.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

    const getProgressColor = (percent: number) => {
        if (percent <= 30) return 'bg-brand-tertiary'; // Early phase / High attention
        if (percent <= 70) return 'bg-brand-secondary'; // Active phase
        return 'bg-green-500'; // Finalizing phase
    };

    if (selectedProject) {
        const budgetUtilized = selectedProject.budget > 0 ? (selectedProject.spent / selectedProject.budget) * 100 : 0;
        const deadline = getDeadlineStatus(selectedProject.endDate);
        const isActiveStatus = selectedProject.status === ProjectStatus.InProgress;
        const isOnHold = selectedProject.status === ProjectStatus.OnHold;
        const canManageUploads = selectedProject.status === ProjectStatus.InProgress || selectedProject.status === ProjectStatus.Completed;

        return (
            <div className="space-y-6 animate-fadeIn pb-20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-brand-primary transition-all uppercase tracking-[0.2em] group">
                        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/> Return to Registry
                    </button>
                    
                    {isAdminOrPM && (
                        <div className="flex items-center gap-2">
                            {isOnHold ? (
                                <button onClick={handleResumeProject} className="flex items-center gap-2 text-[10px] font-bold bg-green-500 text-white px-5 py-2 rounded-xl hover:brightness-110 shadow-lg uppercase tracking-widest transition-all">
                                    <PlayIcon className="w-3.5 h-3.5"/> Resume Operations
                                </button>
                            ) : isActiveStatus && (
                                <button onClick={handleHoldProject} className="flex items-center gap-2 text-[10px] font-bold bg-brand-secondary text-brand-secondary-content px-5 py-2 rounded-xl hover:brightness-110 shadow-lg uppercase tracking-widest transition-all">
                                    <PauseIcon className="w-3.5 h-3.5"/> Suspend Project
                                </button>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Header Surface */}
                <div className="bg-base-100 dark:bg-[#111111] p-8 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm relative overflow-hidden">
                    {/* Visual Progress Telemetry */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-base-200 dark:bg-white/5">
                        <div 
                            className={`h-full transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(0,0,0,0.1)] ${getProgressColor(selectedProject.completionPercentage)}`}
                            style={{ width: `${selectedProject.completionPercentage}%` }}
                        />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start gap-8 mt-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-brand-primary/10 rounded-xl">
                                    <FolderIcon className="w-8 h-8 text-brand-primary" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold tracking-tighter dark:text-white uppercase leading-none">{selectedProject.title}</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <StatusBadge status={selectedProject.status} />
                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${deadline.bgColor} ${deadline.color} border border-current opacity-80`}>
                                            {deadline.label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl text-sm font-medium">
                                {selectedProject.description || "Operational objective summary not defined."}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 min-w-[220px]">
                            <div className="bg-base-200 dark:bg-white/5 p-4 rounded-xl border border-base-300 dark:border-white/5">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Authority Lead</p>
                                <div className="flex items-center gap-3">
                                    <Avatar name={selectedProject.teamLeader?.name || 'Unknown'} size="sm" />
                                    <span className="text-xs font-bold dark:text-white truncate">{selectedProject.teamLeader?.name}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-brand-primary/5 dark:bg-white/5 rounded-xl text-center border border-dashed border-brand-primary/20">
                                <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">{selectedProject.completionPercentage}% PROGRESS</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Intelligence Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <FinanceIcon className="w-5 h-5 text-brand-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-widest dark:text-white">Fiscal Telemetry</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Consumption</p>
                                        <p className="text-2xl font-bold dark:text-white">{formatCurrency(selectedProject.spent)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Ceiling</p>
                                        <p className="text-xs font-bold text-gray-500">{formatCurrency(selectedProject.budget)}</p>
                                    </div>
                                </div>
                                <div className="w-full h-2.5 bg-base-200 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${budgetUtilized > 100 ? 'bg-brand-tertiary animate-pulse' : 'bg-brand-primary'}`} 
                                        style={{ width: `${Math.min(budgetUtilized, 100)}%` }} 
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.1em]">
                                    <span className={budgetUtilized > 100 ? 'text-brand-tertiary' : 'text-brand-primary'}>{budgetUtilized.toFixed(1)}% Consumed</span>
                                    <span className="text-gray-400">{formatCurrency(Math.max(0, selectedProject.budget - selectedProject.spent))} Remaining</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl shadow-sm border border-base-300 dark:border-white/10">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <PaperclipIcon className="w-5 h-5 text-brand-primary" />
                                    <h3 className="text-xs font-bold uppercase tracking-widest dark:text-white">Archived Assets</h3>
                                </div>
                                {canManageUploads && !isOnHold && (
                                    <>
                                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline disabled:opacity-50 flex items-center gap-1">
                                            {uploading ? 'Syncing...' : <><PlusIcon className="w-3 h-3"/> Upload</>}
                                        </button>
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                    </>
                                )}
                            </div>
                            <div className="space-y-3">
                                {selectedProject.documents?.length ? selectedProject.documents.map((doc) => (
                                    <DocumentPreview key={doc.id} doc={doc} />
                                )) : <p className="text-[10px] text-center text-gray-400 uppercase py-6 font-bold tracking-widest border border-dashed border-base-300 dark:border-white/5 rounded-xl">No assets archived</p>}
                            </div>
                        </div>

                        <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <CalendarIcon className="w-5 h-5 text-brand-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-widest dark:text-white">Temporal Awareness</h3>
                            </div>
                            <div className="flex justify-between text-xs font-bold mb-4">
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Deployed</p><p className="dark:text-white">{new Date(selectedProject.startDate).toLocaleDateString()}</p></div>
                                <div className="text-right"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Terminal</p><p className="dark:text-white">{new Date(selectedProject.endDate).toLocaleDateString()}</p></div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-base-200 dark:bg-white/5 p-3 rounded-lg border border-base-300 dark:border-white/10">
                                <ClockIcon className="w-4 h-4 text-brand-primary" />
                                <span>Real-time deadline tracking enabled</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Operation Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm min-h-full">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5 text-brand-primary" />
                                    <h3 className="text-xs font-bold uppercase tracking-widest dark:text-white">Operational Registry</h3>
                                </div>
                                {isActiveStatus && !isOnHold && (
                                    <button onClick={() => setIsAddTaskOpen(true)} className="flex items-center gap-2 text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-4 py-2 rounded-xl hover:bg-brand-primary hover:text-white transition-all uppercase tracking-widest border border-brand-primary/20 shadow-sm">
                                        <PlusIcon className="w-3.5 h-3.5"/> Initialize Task
                                    </button>
                                )}
                            </div>

                            {isAddTaskOpen && (
                                <div className="mb-6 p-6 bg-brand-primary/5 dark:bg-white/5 rounded-2xl border border-dashed border-brand-primary/30 animate-fadeIn ring-4 ring-brand-primary/5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">New Task Deployment</h4>
                                        <button onClick={() => setIsAddTaskOpen(false)} className="text-gray-400 hover:text-brand-tertiary"><XIcon className="w-4 h-4" /></button>
                                    </div>
                                    <form onSubmit={handleAddTask} className="flex gap-4">
                                        <input 
                                            type="text" 
                                            placeholder="Enter operational identifier..." 
                                            value={newTaskName} 
                                            onChange={e => setNewTaskName(e.target.value)} 
                                            className="flex-1 px-4 py-3 text-sm bg-base-100 dark:bg-black border border-base-300 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-black dark:text-white font-bold" 
                                            required 
                                            autoFocus
                                        />
                                        <button type="submit" className="px-10 py-3 bg-brand-primary text-white text-[10px] font-bold uppercase rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all">
                                            Deploy
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div className="space-y-3">
                                {selectedProject.tasks?.length ? selectedProject.tasks.map(task => {
                                    const isCompleting = completingTaskId === task.id;
                                    const isEditing = editingTaskId === task.id;
                                    const isCompleted = task.status === TaskStatus.Completed;
                                    const canModify = !isCompleted || isAdminOrPM;

                                    return (
                                        <div key={task.id} className={`p-5 rounded-2xl border transition-all shadow-sm group ${isCompleted ? 'bg-base-200/40 dark:bg-white/[0.02] border-base-200 dark:border-white/5' : 'bg-base-100 dark:bg-[#090909] border-base-300 dark:border-white/5 hover:border-brand-primary/30'}`}>
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className={`mt-1 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-2 ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-white/10 animate-pulse'}`}>
                                                        {isCompleted && <CheckIcon className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        {isEditing ? (
                                                            <div className="flex gap-2 items-center">
                                                                <input 
                                                                    type="text" 
                                                                    value={nameEditInputs[task.id] || task.name} 
                                                                    onChange={e => setNameEditInputs({...nameEditInputs, [task.id]: e.target.value})}
                                                                    className="bg-base-200 dark:bg-black border border-brand-primary/30 rounded px-2 py-1 text-sm font-bold text-white w-full outline-none focus:ring-1 focus:ring-brand-primary"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleRenameTask(task.id)} className="text-green-500 hover:scale-110 transition-transform" title="Confirm"><CheckIcon className="w-4 h-4"/></button>
                                                                <button onClick={() => setEditingTaskId(null)} className="text-gray-400 hover:text-brand-tertiary" title="Cancel"><XIcon className="w-4 h-4"/></button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`text-sm font-bold truncate transition-colors ${isCompleted ? 'text-gray-500 dark:text-gray-400 line-through' : 'dark:text-white'}`}>
                                                                        {task.name}
                                                                    </p>
                                                                    {canModify && !isOnHold && (
                                                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                                                                            <button onClick={() => {
                                                                                setEditingTaskId(task.id);
                                                                                setNameEditInputs({...nameEditInputs, [task.id]: task.name});
                                                                            }} className="text-gray-400 hover:text-brand-primary" title="Edit Task Name">
                                                                                <PencilIcon className="w-3.5 h-3.5"/>
                                                                            </button>
                                                                            <button onClick={() => handleDeleteTask(task.id, task.name)} className="text-gray-400 hover:text-brand-tertiary" title="Delete Task">
                                                                                <TrashIcon className="w-3.5 h-3.5"/>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1.5 mt-1">
                                                                    <UserGroupIcon className="w-2.5 h-2.5" /> Agent: {task.assignedTo?.name}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                    {isCompleted ? (
                                                        <div className="text-right flex flex-col items-end">
                                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Consumption</p>
                                                            <p className="text-xs font-black dark:text-gray-200">{formatCurrency(task.completionDetails?.actualCost || 0)}</p>
                                                        </div>
                                                    ) : (!isCompleting && isActiveStatus && !isOnHold) && (
                                                        <button 
                                                            onClick={() => {
                                                                setCostInputs({...costInputs, [task.id]: ''});
                                                                setCompletingTaskId(task.id);
                                                            }}
                                                            className="px-4 py-2 bg-green-500/10 text-green-600 border border-green-500/20 text-[9px] font-black uppercase rounded-xl hover:bg-green-600 hover:text-white transition-all tracking-[0.15em] shadow-sm"
                                                        >
                                                            Finalize Task
                                                        </button>
                                                    )}
                                                    <StatusBadge status={task.status} />
                                                </div>
                                            </div>

                                            {isCompleting && (
                                                <div className="mt-4 p-5 bg-base-200 dark:bg-black/60 rounded-2xl border border-green-500/30 animate-fadeIn ring-4 ring-green-500/5">
                                                    <p className="text-[10px] font-bold text-green-600 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                                                        <InformationCircleIcon className="w-4 h-4" /> Final Consumption Reporting Required
                                                    </p>
                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                        <div className="relative flex-1">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                                            <input 
                                                                type="number" 
                                                                placeholder="Actual Consumption Cost..." 
                                                                value={costInputs[task.id] || ''}
                                                                onChange={e => setCostInputs({...costInputs, [task.id]: e.target.value})}
                                                                className="w-full pl-8 pr-4 py-3 text-xs bg-base-100 dark:bg-[#111111] border border-base-300 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-green-500/50 font-bold"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleCompleteTask(task.id)}
                                                                className="flex-1 px-8 py-3 bg-green-600 text-white text-[10px] font-bold uppercase rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                                                            >
                                                                <CheckIcon className="w-3.5 h-3.5" /> Submit & Close
                                                            </button>
                                                            <button 
                                                                onClick={() => { setCompletingTaskId(null); setCostInputs({...costInputs, [task.id]: ''}); }}
                                                                className="px-6 py-3 text-gray-400 hover:text-brand-tertiary text-[10px] font-bold uppercase transition-colors"
                                                            >
                                                                Abort
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-20 border-2 border-dashed border-base-300 dark:border-white/5 rounded-2xl bg-base-200/30 dark:bg-white/[0.01]">
                                        <InformationCircleIcon className="w-8 h-8 text-gray-300 mx-auto mb-4 opacity-50" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Operational registry is empty</p>
                                        <p className="text-[10px] text-gray-500 uppercase mt-2">Initialize tasks to start consumption tracking</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-100 dark:bg-[#111111] p-8 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm">
                <div>
                    <h2 className="text-3xl font-bold dark:text-white uppercase tracking-tighter">Operational Workspace</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-3">Comprehensive Project Audit & Execution Registry</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-brand-primary text-white font-bold py-3.5 px-10 rounded-xl shadow-xl hover:brightness-110 active:scale-95 transition-all uppercase text-[10px] tracking-[0.25em] flex items-center gap-3">
                    <PlusIcon className="w-4 h-4"/> Initialize Scope
                </button>
            </div>

            <div className="relative max-w-xl">
                <FolderIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
                <input 
                    type="text" 
                    placeholder="Search active project registry..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full pl-14 pr-6 py-4 bg-base-100 dark:bg-[#111111] border border-base-300 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all shadow-sm text-sm font-bold uppercase tracking-wider" 
                />
            </div>

            <ProjectsTable projects={filteredProjects} onViewProject={(id) => setSelectedProject(projects.find(p => p.id === id) || null)} sortConfig={null} requestSort={() => {}} />

            {isCreateModalOpen && (
                <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} users={users} onSave={async (data) => {
                    const { error } = await supabase.from('projects').insert([{ 
                        ...data, 
                        status: ProjectStatus.Pending, 
                        spent: 0, 
                        completionPercentage: 0, 
                        tasks: [], 
                        documents: [] 
                    }]);
                    if (!error) { 
                        setIsCreateModalOpen(false); 
                        refreshData(); 
                        logActivity('Scope Initialization', data.title);
                    }
                }} />
            )}
        </div>
    );
};

export default ProjectsPage;
