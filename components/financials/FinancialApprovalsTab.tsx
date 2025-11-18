import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Project, ProjectStatus, NotificationType, NotificationPriority } from '../../types';
import { CheckIcon, XIcon } from '../IconComponents';
import RejectionModal from './RejectionModal';
import { logActivity } from '../../services/activityLogger';
import { createNotification } from '../../services/notificationService';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const FinancialApprovalsTab: React.FC = () => {
    const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectToReject, setProjectToReject] = useState<Project | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'projects'), where('status', '==', ProjectStatus.Pending));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const projectsData: Project[] = [];
            querySnapshot.forEach(doc => {
                projectsData.push({ ...doc.data(), id: doc.id } as Project);
            });
            setPendingProjects(projectsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleApprove = async (project: Project) => {
        if (!project.id || !project.teamLeader.id) return;
        const projectDoc = doc(db, 'projects', project.id);
        await updateDoc(projectDoc, {
            status: ProjectStatus.InProgress,
        });
        logActivity('Approved Project', project.title);
        createNotification({
            userId: project.teamLeader.id,
            title: 'Project Approved',
            message: `Your project "${project.title}" has been approved and is now in progress.`,
            type: NotificationType.ApprovalResult,
            priority: NotificationPriority.High,
            link: `/projects/${project.id}`
        });
    };

    const handleReject = async (project: Project, reason: string) => {
        if (!project.id || !project.teamLeader.id) return;
        const projectDoc = doc(db, 'projects', project.id);
        await updateDoc(projectDoc, {
            status: ProjectStatus.OnHold,
            rejectionReason: reason
        });
        logActivity('Rejected Project', `${project.title} for reason: ${reason}`);
        createNotification({
            userId: project.teamLeader.id,
            title: 'Project Rejected',
            message: `Your project "${project.title}" has been put on hold. Reason: ${reason}`,
            type: NotificationType.ApprovalResult,
            priority: NotificationPriority.High,
            link: `/projects/${project.id}`
        });
        setProjectToReject(null);
    };

    if (loading) {
        return <div className="text-center p-10">Loading approvals...</div>;
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
