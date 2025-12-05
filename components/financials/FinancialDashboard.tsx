import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Project, ProjectStatus, TaskStatus } from '../../types';
import ProjectOverviewCard from '../ProjectOverviewCard';
import { FolderIcon, CheckCircleIcon, ClockIcon } from '../IconComponents';
import FinancialSummaryCard from './FinancialSummaryCard';

const FinancialDashboard: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase.from('projects').select('*');
            if (error) {
                console.error("Financial dashboard fetch error:", error);
                setError("Could not load financial overview data.");
            } else if (data) {
                const projectsData: Project[] = data.map((d: any) => {
                    const spent = (d.tasks || []).reduce((sum: number, task: any) => sum + (task.completionDetails?.actualCost || 0), 0);
                    return { ...d, spent };
                });
                setProjects(projectsData);
            }
            setLoading(false);
        };

        fetchProjects();

        const channel = supabase.channel('financial_dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                <h3 className="text-lg font-bold">An Error Occurred</h3>
                <p className="mt-2">{error}</p>
            </div>
        );
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