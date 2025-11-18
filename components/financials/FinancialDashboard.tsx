import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Project, ProjectStatus, TaskStatus } from '../../types';
import ProjectOverviewCard from '../ProjectOverviewCard';
import { FolderIcon, CheckCircleIcon, ClockIcon } from '../IconComponents';
import FinancialSummaryCard from './FinancialSummaryCard';

const FinancialDashboard: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "projects"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const projectsData: Project[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as Omit<Project, 'id' | 'spent'>;
                const spent = (data.tasks || []).reduce((sum, task) => sum + (task.completionDetails?.actualCost || 0), 0);
                projectsData.push({ id: doc.id, ...data, spent });
            });
            setProjects(projectsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const summary = useMemo(() => {
        return projects.reduce((acc, p) => {
            acc.totalProjects++;
            if (p.status === ProjectStatus.InProgress || p.status === ProjectStatus.Completed) acc.approvedProjects++;
            if (p.status === ProjectStatus.Pending) acc.pendingApprovals++;
            acc.totalEstimatedBudget += p.budget;
            acc.totalActualCost += p.spent || 0;
            return acc;
        }, {
            totalProjects: 0,
            approvedProjects: 0,
            pendingApprovals: 0,
            totalEstimatedBudget: 0,
            totalActualCost: 0,
        });
    }, [projects]);

    if (loading) {
        return <div className="text-center p-10">Loading Financial Dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-base-content dark:text-gray-100">Financial Overview</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <ProjectOverviewCard 
                    title="Total Projects" 
                    value={summary.totalProjects} 
                    icon={<FolderIcon className="w-8 h-8"/>} 
                    color="text-blue-500"
                />
                <ProjectOverviewCard 
                    title="Active/Completed" 
                    value={summary.approvedProjects} 
                    icon={<CheckCircleIcon className="w-8 h-8"/>}
                    color="text-green-500" 
                />
                <ProjectOverviewCard 
                    title="Pending Approvals" 
                    value={summary.pendingApprovals} 
                    icon={<ClockIcon className="w-8 h-8"/>} 
                    color="text-yellow-500"
                />
                <FinancialSummaryCard
                    title="Total Budget"
                    amount={summary.totalEstimatedBudget}
                    color="text-indigo-500"
                    bgColor="bg-indigo-100"
                />
                <FinancialSummaryCard
                    title="Total Spent"
                    amount={summary.totalActualCost}
                    color="text-orange-500"
                    bgColor="bg-orange-100"
                />
            </div>

            {/* Placeholder for future charts or tables */}
            <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
                <p>More detailed reports and charts can be found in the 'Reports' tab.</p>
            </div>
        </div>
    );
};

export default FinancialDashboard;