
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Project, ProjectStatus, NotificationType, NotificationPriority } from '../../types';
import { CheckIcon, XIcon } from '../IconComponents';
import RejectionModal from './RejectionModal';
import { logActivity } from '../../services/activityLogger';
import { createNotification } from '../../services/notificationService';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const FinancialApprovalsTab: React.FC = () => {
    const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectToReject, setProjectToReject] = useState<Project | null>(null);

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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `status=eq.${ProjectStatus.Pending}` }, fetchPendingProjects)
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    const handleApprove = async (project: Project) => {
        if (!project.id || !project.teamLeader.id) return;
        
        const { error } = await supabase.from('projects').update({ status: ProjectStatus.InProgress }).eq('id', project.id);
        
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
        if (!project.id || !project.teamLeader.id) return;

        // Requirement: Set status to Rejected if rejected
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

    if (loading) {
        return <div className="text-center p-10">Loading approvals...</div>;
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                <h3 className="text-lg font-bold">An Error Occurred</h3>
                <p className="mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div>
             <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800">
                <table className="min-w-full divide-y divide-base-300 dark:divide-gray-700">
                    <thead className="bg-base-200 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Project Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Budget Requested</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-base-100 divide-y divide-base-200 dark:bg-gray-800 dark:divide-gray-700">
                        {pendingProjects.map(project => (
                            <tr key={project.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-base-content dark:text-gray-100">{project.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-base-content dark:text-gray-300">{formatCurrency(project.budget)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                                    <button onClick={() => handleApprove(project)} className="bg-green-100 text-green-700 p-2 rounded-full hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/80"><CheckIcon className="w-5 h-5"/></button>
                                    <button onClick={() => setProjectToReject(project)} className="bg-red-100 text-red-700 p-2 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/80"><XIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                        {pendingProjects.length === 0 && (
                             <tr>
                                <td colSpan={3} className="text-center py-10 text-base-content-secondary dark:text-gray-400">No projects are currently pending approval.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {projectToReject && <RejectionModal project={projectToReject} onClose={() => setProjectToReject(null)} onConfirm={handleReject} />}
        </div>
    );
};

export default FinancialApprovalsTab;