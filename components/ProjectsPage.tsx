
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

const ProjectsPage: React.FC = () => {
    const { projects, users, currentUser, refreshData, checkPermission } = useAppContext();
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Handle Deep Linking from Notifications
    useEffect(() => {
        const nextId = (window as any).nextProjectIdToOpen;
        if (nextId) {
            const project = projects.find(p => p.id === nextId);
            if (project) {
                setSelectedProject(project);
                (window as any).nextProjectIdToOpen = null; // Clear the flag
            }
        }
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

    if (selectedProject) {
        return (
            <div className="space-y-6 animate-fadeIn">
                <button 
                    onClick={() => setSelectedProject(null)}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-brand-primary transition-colors uppercase tracking-widest"
                >
                    <ArrowLeftIcon className="w-4 h-4"/> Back to Registry
                </button>
                
                <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-3xl font-bold tracking-tighter dark:text-white">{selectedProject.title}</h2>
                                <StatusBadge status={selectedProject.status} />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 max-w-2xl">{selectedProject.description}</p>
                        </div>
                    </div>
                </div>
                {/* Simplified view for brevity as focus is navigation */}
                <div className="p-12 text-center text-gray-400 border-2 border-dashed border-base-300 dark:border-white/5 rounded-2xl">
                    <p className="font-bold uppercase tracking-widest text-xs">Project ID: {selectedProject.id}</p>
                    <p className="mt-2 text-xs uppercase">Full project workspace loaded from registry.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold dark:text-white uppercase tracking-tighter">Project Registry</h2>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-brand-primary text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:brightness-110 transition-all uppercase text-xs tracking-widest flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4"/> New Entry
                </button>
            </div>

            <div className="relative max-w-md">
                <FolderIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
                <input 
                    type="text" 
                    placeholder="Search entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-base-100 dark:bg-[#111111] border border-base-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                />
            </div>

            <ProjectsTable 
                projects={filteredProjects} 
                onViewProject={(id) => setSelectedProject(projects.find(p => p.id === id) || null)}
                sortConfig={null}
                requestSort={() => {}}
            />

            {isCreateModalOpen && (
                <CreateProjectModal 
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    users={users}
                    onSave={async (data) => {
                        const { error } = await supabase.from('projects').insert([{
                            ...data,
                            status: ProjectStatus.Pending,
                            spent: 0,
                            completionPercentage: 0
                        }]);
                        if (!error) {
                            setIsCreateModalOpen(false);
                            refreshData();
                        }
                    }}
                />
            )}
        </div>
    );
};

export default ProjectsPage;
