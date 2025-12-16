
import React, { useMemo } from 'react';
import { ProjectStatus } from '../types';
import { useAppContext } from '../AppContext';
import ProjectOverviewCard from './ProjectOverviewCard';
import FinancialSummaryCard from './FinancialSummaryCard';
import UpcomingDeadlines from './UpcomingDeadlines';
import ProjectStatusChart from './ProjectStatusChart';
import { CheckCircleIcon, ClockIcon, FolderIcon } from './IconComponents';

const Dashboard: React.FC<{setActivePage: (page: string) => void}> = ({setActivePage}) => {
    const { projects } = useAppContext();

    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === ProjectStatus.Completed).length;
    const inProgressProjects = projects.filter(p => p.status === ProjectStatus.InProgress).length;

    const { totalBudget, totalSpent } = useMemo(() => {
        return projects.reduce((acc, p) => {
            acc.totalBudget += (p.budget || 0);
            acc.totalSpent += (p.spent || 0);
            return acc;
        }, { totalBudget: 0, totalSpent: 0 });
    }, [projects]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-base-content dark:text-gray-100">Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ProjectOverviewCard title="Total Projects" value={totalProjects} icon={<FolderIcon className="w-8 h-8"/>} color="text-blue-500" />
                <ProjectOverviewCard title="In Progress" value={inProgressProjects} icon={<ClockIcon className="w-8 h-8"/>} color="text-yellow-500" />
                <ProjectOverviewCard title="Completed" value={completedProjects} icon={<CheckCircleIcon className="w-8 h-8"/>} color="text-green-500" />
                <FinancialSummaryCard totalBudget={totalBudget} totalSpent={totalSpent} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <ProjectStatusChart projects={projects} />
                </div>
                <div className="space-y-6">
                    <UpcomingDeadlines projects={projects} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
