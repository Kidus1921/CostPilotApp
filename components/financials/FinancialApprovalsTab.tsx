import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Project, ProjectStatus, NotificationType, NotificationPriority } from '../../types';
import { CheckIcon, XIcon, CheckCircleIcon } from '../IconComponents';
import RejectionModal from './RejectionModal';
import ProjectPreviewModal from './ProjectPreviewModal';
import { logActivity } from '../../services/activityLogger';
import { createNotification } from '../../services/notificationService';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const FinancialApprovalsTab: React.FC = () => {
    const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectToReject, setProjectToReject] = useState<Project | null>(null);
    const [previewProject, setPreviewProject] = useState<Project | null>(null);

    const fetchPendingProjects = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('status', ProjectStatus.Pending);

        if (error) {
            console.error("Financial approvals fetch error:", error);
            setError("Could not load pending approvals.");
        } else if (data) {
            setPendingProjects(data as Project[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPendingProjects();
        const sub = supabase.channel('financial_approvals')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchPendingProjects)
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    const handleApprove = async (e: React.MouseEvent, project: Project) => {
        e.stopPropagation(); // Prevent row click (preview)
        if (!project.id || !project.teamLeader?.id) return;
        
        const { error } = await supabase.from('projects').update({ 
            status: ProjectStatus.InProgress,
            acceptedAt: new Date().toISOString(),
            rejectionReason: null // Clear any previous rejection
        }).eq('id', project.id);
        
        if (error) {
            console.error("Failed to approve project:", error);
            return;
        }

        logActivity('Approved Project', project.title);
        createNotification({
            userId: project.teamLeader.id,
            title: 'Project Approved',
            message: `Your project "${project.title}" has been approved and is now in progress.`,
            type: NotificationType.ApprovalResult,
            priority: NotificationPriority.High,
            link: `/projects/${project.id}`
        });
        fetchPendingProjects();
    };

    const handleReject = async (project: Project, reason: string) => {
        if (!project.id || !project.teamLeader?.id) return;

        const { error } = await supabase.from('projects').update({ 
            status: ProjectStatus.Rejected,
            rejectionReason: reason 
        }).eq('id', project.id);

        if (error) {
             console.error("Failed to reject project:", error);
             return;
        }

        logActivity('Rejected Project', `${project.title} for reason: ${reason}`);
        createNotification({
            userId: project.teamLeader.id,
            title: 'Project Rejected',
            message: `Your project "${project.title}" has been rejected. Reason: ${reason}`,
            type: NotificationType.ApprovalResult,
            priority: NotificationPriority.High,
            link: `/projects/${project.id}`
        });
        setProjectToReject(null);
        fetchPendingProjects();
    };

    const openRejectModal = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation(); // Prevent row click (preview)
        setProjectToReject(project);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-brand-primary/10"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-brand-primary animate-spin"></div>
                </div>
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Awaiting Queue...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-brand-tertiary bg-brand-tertiary/10 rounded-2xl border border-brand-tertiary/20">
                <h3 className="text-lg font-bold uppercase tracking-wider">Approval Engine Error</h3>
                <p className="mt-2 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
             <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden dark:bg-[#111111] dark:border-white/10">
                <table className="min-w-full divide-y divide-base-300 dark:divide-gray-700">
                    <thead className="bg-base-200 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Project Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Budget Requested</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Decisions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200 dark:divide-gray-700">
                        {pendingProjects.map(project => (
                            <tr 
                                key={project.id} 
                                className="hover:bg-base-200/50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer"
                                onClick={() => setPreviewProject(project)}
                            >
                                <td className="px-6 py-5 whitespace-nowrap font-bold text-base-content dark:text-gray-100">
                                    {project.title}
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap font-bold text-brand-primary">{formatCurrency(project.budget)}</td>
                                <td className="px-6 py-5 whitespace-nowrap text-center space-x-3">
                                    <button 
                                        onClick={(e) => handleApprove(e, project)} 
                                        className="inline-flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-6 rounded-xl shadow-lg hover:brightness-110 transition-all text-xs"
                                    >
                                        <CheckIcon className="w-4 h-4"/> Approve
                                    </button>
                                    <button 
                                        onClick={(e) => openRejectModal(e, project)} 
                                        className="inline-flex items-center gap-2 bg-brand-tertiary text-white font-bold py-2 px-6 rounded-xl shadow-lg hover:brightness-110 transition-all text-xs"
                                    >
                                        <XIcon className="w-4 h-4"/> Reject
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {pendingProjects.length === 0 && (
                             <tr>
                                <td colSpan={3} className="text-center py-16 text-gray-400">
                                    <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No pending approvals</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Modals */}
            {projectToReject && <RejectionModal project={projectToReject} onClose={() => setProjectToReject(null)} onConfirm={handleReject} />}
            {previewProject && <ProjectPreviewModal project={previewProject} onClose={() => setPreviewProject(null)} />}
        </div>
    );
};

export default FinancialApprovalsTab;