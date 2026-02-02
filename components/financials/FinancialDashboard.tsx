
import React, { useMemo } from 'react';
import { ProjectStatus } from '../../types';
import { useAppContext } from '../../AppContext';
import ProjectOverviewCard from '../projects/ProjectOverviewCard';
import { FolderIcon, CheckCircleIcon, ClockIcon } from '../IconComponents';
import FinancialSummaryCard from './FinancialSummaryCard';

const FinancialDashboard: React.FC = () => {
    const { projects, loading } = useAppContext();

    const summary = useMemo(() => {
        return projects.reduce((acc, p) => {
            acc.totalProjects++;
            if (p.status === ProjectStatus.InProgress || p.status === ProjectStatus.Completed) acc.approvedProjects++;
            if (p.status === ProjectStatus.Pending) acc.pendingApprovals++;
            acc.totalEstimatedBudget += (p.budget || 0);
            acc.totalActualCost += (p.spent || 0);
            return acc;
        }, {
            totalProjects: 0,
            approvedProjects: 0,
            pendingApprovals: 0,
            totalEstimatedBudget: 0,
            totalActualCost: 0,
        });
    }, [projects]);

    if (loading && projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-brand-primary/10"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-brand-primary animate-spin"></div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-xs tracking-widest animate-pulse">Synchronizing Portfolio...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <ProjectOverviewCard 
                    title="Total Projects" 
                    value={summary.totalProjects} 
                    icon={<FolderIcon className="w-8 h-8"/>} 
                    color="text-gray-500"
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
                    color="text-brand-primary"
                />
                <FinancialSummaryCard
                    title="Portfolio Budget"
                    amount={summary.totalEstimatedBudget}
                    color="text-brand-primary"
                    bgColor="bg-brand-primary/10"
                />
                <FinancialSummaryCard
                    title="Actual Consumption"
                    amount={summary.totalActualCost}
                    color={summary.totalActualCost > summary.totalEstimatedBudget ? "text-brand-tertiary" : "text-brand-primary"}
                    bgColor={summary.totalActualCost > summary.totalEstimatedBudget ? "bg-brand-tertiary/10" : "bg-brand-primary/10"}
                />
            </div>

            <div className="mt-8 text-center bg-base-100 dark:bg-[#111111] p-12 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm">
                <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FolderIcon className="w-8 h-8 text-brand-primary" />
                    </div>
                    <h4 className="text-lg font-bold dark:text-white uppercase tracking-wider mb-2">Fiscal Audit Readiness</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Detailed fiscal breakdown and project audit trails are available in the specialized tabs above. All currency data is synced in real-time with project task completions.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FinancialDashboard;
