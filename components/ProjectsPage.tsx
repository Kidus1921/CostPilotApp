
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Project, ProjectStatus, TaskStatus, UserRole, Task, Document, ExpenseCategory } from '../types';
import { useAppContext } from '../AppContext';
import ProjectsTable from './ProjectsTable';
import CreateProjectModal from './CreateProjectModal';
import { ArrowLeftIcon, PlusIcon, FolderIcon, ClockIcon, CheckCircleIcon, FinanceIcon, UserGroupIcon, CalendarIcon, XIcon, PaperclipIcon, CheckIcon, PencilIcon, TrashIcon } from './IconComponents';
import Avatar from './Avatar';
import { logActivity } from '../services/activityLogger';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

// Helper for safe ID generation
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Fix: Removed duplicate 'In Progress' key which caused an object literal error as it is shared between ProjectStatus and TaskStatus
const StatusBadge: React.FC<{ status: ProjectStatus | TaskStatus }> = ({ status }) => {
    const colorMap: Record<string, string> = {
        [ProjectStatus.InProgress]: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20',
        [ProjectStatus.Completed]: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300',
        [ProjectStatus.OnHold]: 'bg-brand-secondary/20 text-brand-primary border border-brand-secondary/30',
        [ProjectStatus.Pending]: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-200',
        [ProjectStatus.Rejected]: 'bg-brand-tertiary/10 text-brand-tertiary border border-brand-tertiary/20',
    };
    // Map TaskStatus.Completed to ProjectStatus.Completed visual style
    const statusKey = status === TaskStatus.Completed ? ProjectStatus.Completed : status;
    return <span className={`px-2.5 py-0.5 inline-flex text-[10px] uppercase tracking-widest leading-5 font-bold rounded-full ${colorMap[statusKey as string] || 'bg-gray-100'}`}>{status}</span>
};

const ProjectsPage: React.FC = () => {
    const { projects, users, currentUser, refreshData } = useAppContext();
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    
    // Per-Task UI States to prevent race conditions
    const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [costInputs, setCostInputs] = useState<Record<string, string>>({});
    const [nameEditInputs, setNameEditInputs] = useState<Record<string, string>>({});

    const [newTaskName, setNewTaskName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle external navigation (from notifications)
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

    // Keep selected project fresh when global data updates
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
        return { spent, completionPercentage };
    };

    const updateProjectTasks = async (updatedTasks: Task[], actionType: string, actionDetail: string) => {
        if (!selectedProject) return;
        
        const { spent, completionPercentage } = calculateProjectMetrics(updatedTasks);
        
        const { error } = await supabase
            .from('projects')
            .update({ 
                tasks: updatedTasks,
                spent,
                completionPercentage
            })
            .eq('id', selectedProject.id);

        if (!error) {
            logActivity(actionType, `${actionDetail} in ${selectedProject.title}`);
            refreshData();
        } else {
            alert(`Error updating project: ${error.message}`);
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
        await updateProjectTasks(updatedTasks, 'Added Task', newTask.name);
        setIsAddTaskOpen(false);
        setNewTaskName('');
    };

    const handleRenameTask = async (taskId: string) => {
        const newName = nameEditInputs[taskId];
        if (!selectedProject || !newName?.trim()) return;

        const updatedTasks = (selectedProject.tasks || []).map(t => 
            t.id === taskId ? { ...t, name: newName.trim() } : t
        );

        await updateProjectTasks(updatedTasks, 'Renamed Task', newName);
        setEditingTaskId(null);
    };

    const handleDeleteTask = async (taskId: string, taskName: string) => {
        if (!selectedProject || !confirm(`Remove task "${taskName}" from registry?`)) return;

        const updatedTasks = (selectedProject.tasks || []).filter(t => t.id !== taskId);
        await updateProjectTasks(updatedTasks, 'Deleted Task', taskName);
    };

    const handleCompleteTask = async (taskId: string) => {
        const costStr = costInputs[taskId];
        if (!selectedProject || !costStr) return;

        const actualCost = parseFloat(costStr);
        if (isNaN(actualCost)) {
            alert("Please enter a valid numeric cost.");
            return;
        }

        const updatedTasks = (selectedProject.tasks || []).map(t => {
            if (t.id === taskId) {
                return {
                    ...t,
                    status: TaskStatus.Completed,
                    completionDetails: {
                        description: 'Completed via Operational Dashboard',
                        category: ExpenseCategory.Miscellaneous,
                        actualCost: actualCost,
                        completedAt: new Date().toISOString()
                    }
                };
            }
            return t;
        });

        await updateProjectTasks(updatedTasks, 'Completed Task', `Task finalized at ${formatCurrency(actualCost)}`);
        setCompletingTaskId(null);
        setCostInputs(prev => {
            const next = { ...prev };
            delete next[taskId];
            return next;
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProject || !currentUser) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${selectedProject.id}/${Math.random()}.${fileExt}`;
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
            const { error: dbError } = await supabase.from('projects').update({ documents: updatedDocs }).eq('id', selectedProject.id);
            if (dbError) throw dbError;

            logActivity('Uploaded Document', `${file.name} for ${selectedProject.title}`);
            refreshData();
        } catch (error: any) {
            alert("Error uploading document: " + error.message);
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

    if (selectedProject) {
        const budgetUtilized = selectedProject.budget > 0 ? (selectedProject.spent / selectedProject.budget) * 100 : 0;
        
        return (
            <div className="space-y-6 animate-fadeIn pb-10">
                <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-brand-primary transition-colors uppercase tracking-[0.2em]">
                    <ArrowLeftIcon className="w-4 h-4"/> Return to Registry
                </button>
                
                <div className="bg-base-100 dark:bg-[#111111] p-8 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-brand-primary/10 rounded-xl">
                                    <FolderIcon className="w-8 h-8 text-brand-primary" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold tracking-tighter dark:text-white uppercase">{selectedProject.title}</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <StatusBadge status={selectedProject.status} />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {selectedProject.id?.slice(0,8)}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl text-sm font-medium">
                                {selectedProject.description || "No objective summary provided."}
                            </p>
                        </div>
                        <div className="bg-base-200 dark:bg-white/5 p-4 rounded-xl border border-base-300 dark:border-white/5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lead Authority</p>
                            <div className="flex items-center gap-2">
                                <Avatar name={selectedProject.teamLeader?.name || 'Unknown'} size="sm" />
                                <span className="text-sm font-bold dark:text-white">{selectedProject.teamLeader?.name}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <FinanceIcon className="w-5 h-5 text-brand-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-widest dark:text-white">Fiscal Status</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Consumption</p>
                                        <p className="text-2xl font-bold dark:text-white">{formatCurrency(selectedProject.spent)}</p>
                                    </div>
                                    <p className="text-sm font-bold text-gray-500">{formatCurrency(selectedProject.budget)}</p>
                                </div>
                                <div className="w-full h-2 bg-base-200 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${budgetUtilized > 100 ? 'bg-brand-tertiary shadow-[0_0_10px_rgba(196,16,52,0.5)]' : 'bg-brand-primary'}`} style={{ width: `${Math.min(budgetUtilized, 100)}%` }} />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                    <span className={budgetUtilized > 100 ? 'text-brand-tertiary' : 'text-brand-primary'}>{budgetUtilized.toFixed(1)}% Utilized</span>
                                    <span className="text-gray-400">{formatCurrency(selectedProject.budget - selectedProject.spent)} Left</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl shadow-sm border border-base-300 dark:border-white/10">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <PaperclipIcon className="w-5 h-5 text-brand-primary" />
                                    <h3 className="text-xs font-bold uppercase tracking-widest dark:text-white">Assets</h3>
                                </div>
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline disabled:opacity-50">
                                    {uploading ? 'Syncing...' : 'Upload'}
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            </div>
                            <div className="space-y-3">
                                {selectedProject.documents?.length ? selectedProject.documents.map((doc) => (
                                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-base-200/50 dark:bg-white/5 rounded-xl border border-base-300 dark:border-white/5 hover:border-brand-primary/30 transition-all group overflow-hidden">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <PaperclipIcon className="w-4 h-4 text-gray-400 group-hover:text-brand-primary flex-shrink-0" />
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold dark:text-white truncate">{doc.name}</p>
                                                <p className="text-[8px] text-gray-400 uppercase font-bold tracking-widest">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </a>
                                )) : <p className="text-[10px] text-center text-gray-400 uppercase py-4">No assets synced</p>}
                            </div>
                        </div>

                        <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <CalendarIcon className="w-5 h-5 text-brand-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-widest dark:text-white">Timeline</h3>
                            </div>
                            <div className="flex justify-between text-xs font-bold mb-4">
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Deployed</p><p className="dark:text-white">{new Date(selectedProject.startDate).toLocaleDateString()}</p></div>
                                <div className="text-right"><p className="text-[10px] font-bold text-gray-400 uppercase">Terminal</p><p className="dark:text-white">{new Date(selectedProject.endDate).toLocaleDateString()}</p></div>
                            </div>
                            <div className="p-3 bg-base-200/50 dark:bg-white/5 rounded-xl text-center shadow-inner">
                                <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">{selectedProject.completionPercentage}% PROGRESS</span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm min-h-full">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5 text-brand-primary" />
                                    <h3 className="text-xs font-bold uppercase tracking-widest dark:text-white">Operational Tasks</h3>
                                </div>
                                <button onClick={() => setIsAddTaskOpen(true)} className="flex items-center gap-2 text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-lg hover:bg-brand-primary hover:text-white transition-all uppercase tracking-widest border border-brand-primary/20">
                                    <PlusIcon className="w-3 h-3"/> Add Task
                                </button>
                            </div>

                            {isAddTaskOpen && (
                                <div className="mb-6 p-6 bg-brand-primary/5 dark:bg-white/5 rounded-2xl border border-dashed border-brand-primary/30 animate-fadeIn">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Initialize New Task</h4>
                                        <button onClick={() => setIsAddTaskOpen(false)} className="text-gray-400 hover:text-brand-tertiary"><XIcon className="w-4 h-4" /></button>
                                    </div>
                                    <form onSubmit={handleAddTask} className="flex gap-4">
                                        <input 
                                            type="text" 
                                            placeholder="Enter Task Identifier..." 
                                            value={newTaskName} 
                                            onChange={e => setNewTaskName(e.target.value)} 
                                            className="flex-1 px-4 py-2.5 text-sm bg-base-100 dark:bg-black border border-base-300 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-black dark:text-white" 
                                            required 
                                            autoFocus
                                        />
                                        <button type="submit" className="px-8 py-2 bg-brand-primary text-white text-[10px] font-bold uppercase rounded-xl shadow-lg hover:brightness-110">
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

                                    return (
                                        <div key={task.id} className="p-5 bg-base-100 dark:bg-[#090909] border border-base-300 dark:border-white/5 rounded-xl flex flex-col gap-4 group hover:border-brand-primary/30 transition-all shadow-sm">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isCompleted ? 'bg-green-500' : 'bg-brand-primary animate-pulse'}`} />
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
                                                                <button onClick={() => handleRenameTask(task.id)} className="text-green-500 hover:scale-110 transition-transform" title="Confirm Rename"><CheckIcon className="w-4 h-4"/></button>
                                                                <button onClick={() => setEditingTaskId(null)} className="text-gray-400 hover:text-brand-tertiary" title="Cancel"><XIcon className="w-4 h-4"/></button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-bold dark:text-white group-hover:text-brand-primary transition-colors truncate">{task.name}</p>
                                                                    {!isCompleted && (
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
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Agent: {task.assignedTo?.name}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                    {isCompleted ? (
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase">Consumption</p>
                                                                <p className="text-xs font-bold dark:text-gray-200">{formatCurrency(task.completionDetails?.actualCost || 0)}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleDeleteTask(task.id, task.name)}
                                                                className="p-1.5 text-gray-500 hover:text-brand-tertiary hover:bg-brand-tertiary/10 rounded transition-all"
                                                                title="Delete Completed Task"
                                                            >
                                                                <TrashIcon className="w-4 h-4"/>
                                                            </button>
                                                        </div>
                                                    ) : !isCompleting && (
                                                        <button 
                                                            onClick={() => {
                                                                setCostInputs({...costInputs, [task.id]: ''});
                                                                setCompletingTaskId(task.id);
                                                            }}
                                                            className="px-3 py-1.5 bg-green-500/10 text-green-600 border border-green-500/20 text-[9px] font-black uppercase rounded-lg hover:bg-green-600 hover:text-white transition-all tracking-widest"
                                                        >
                                                            Mark Complete
                                                        </button>
                                                    )}
                                                    <StatusBadge status={task.status} />
                                                </div>
                                            </div>

                                            {isCompleting && (
                                                <div className="mt-2 p-4 bg-base-200 dark:bg-black/40 rounded-xl border border-green-500/30 animate-fadeIn">
                                                    <p className="text-[10px] font-bold text-green-600 uppercase mb-3 tracking-widest">Provide Terminal Consumption Cost</p>
                                                    <div className="flex gap-3">
                                                        <div className="relative flex-1">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                                            <input 
                                                                type="number" 
                                                                placeholder="Actual Cost..." 
                                                                value={costInputs[task.id] || ''}
                                                                onChange={e => setCostInputs({...costInputs, [task.id]: e.target.value})}
                                                                className="w-full pl-8 pr-4 py-2 text-sm bg-base-100 dark:bg-[#111111] border border-base-300 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-green-500/50"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => handleCompleteTask(task.id)}
                                                            className="px-5 py-2 bg-green-600 text-white text-[10px] font-bold uppercase rounded-lg hover:brightness-110 flex items-center gap-2"
                                                        >
                                                            <CheckIcon className="w-3 h-3" /> Finalize
                                                        </button>
                                                        <button 
                                                            onClick={() => { setCompletingTaskId(null); setCostInputs({...costInputs, [task.id]: ''}); }}
                                                            className="px-4 py-2 text-gray-400 text-[10px] font-bold uppercase hover:text-brand-tertiary"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-20 border-2 border-dashed border-base-300 dark:border-white/5 rounded-xl">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No tasks defined for this scope</p>
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold dark:text-white uppercase tracking-tighter">Project Registry</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Operational Workspace Inventory</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-brand-primary text-white font-bold py-2.5 px-8 rounded-xl shadow-lg hover:brightness-110 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                    <PlusIcon className="w-4 h-4"/> Initialize Project
                </button>
            </div>

            <div className="relative max-w-md">
                <FolderIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
                <input type="text" placeholder="Search active registry..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-base-100 dark:bg-[#111111] border border-base-300 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all shadow-sm text-sm font-medium" />
            </div>

            <ProjectsTable projects={filteredProjects} onViewProject={(id) => setSelectedProject(projects.find(p => p.id === id) || null)} sortConfig={null} requestSort={() => {}} />

            {isCreateModalOpen && (
                <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} users={users} onSave={async (data) => {
                    const { error } = await supabase.from('projects').insert([{ ...data, status: ProjectStatus.Pending, spent: 0, completionPercentage: 0, tasks: [], documents: [] }]);
                    if (!error) { setIsCreateModalOpen(false); refreshData(); }
                }} />
            )}
        </div>
    );
};

export default ProjectsPage;
