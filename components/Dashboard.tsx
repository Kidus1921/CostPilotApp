
import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectStatus, Priority, User, Activity, TaskStatus } from '../types';
import ProjectOverviewCard from './ProjectOverviewCard';
import FinancialSummaryCard from './FinancialSummaryCard';
import UpcomingDeadlines from './UpcomingDeadlines';
import ProjectStatusChart from './ProjectStatusChart';
import RecentActivity from './RecentActivity';
import { CheckCircleIcon, ClockIcon, FolderIcon } from './IconComponents';
import { mockProjects as allMockProjects, mockActivities } from './ProjectsPage'; // Import centralized data

const Dashboard: React.FC<{setActivePage: (page: string) => void}> = ({setActivePage}) => {
    const [projects, setProjects] = useState<Project[]>([]);
    
    useEffect(() => {
        // Simulate fetching data, now calculating dynamic values
        const processedProjects = allMockProjects.map(p => {
            // If project is completed, trust the hardcoded values. This preserves 100% progress and historic spending.
            if (p.status === ProjectStatus.Completed) {
                return p;
            }
            // For other projects, calculate dynamically.
            const completedTasks = p.tasks.filter(t => t.status === TaskStatus.Completed).length;
            // This correctly handles the case for 0 tasks, setting percentage to 0.
            const completionPercentage = p.tasks.length > 0 ? Math.round((completedTasks / p.tasks.length) * 100) : 0;
            const spent = p.tasks.reduce((acc, task) => acc + (task.completionDetails?.actualCost || 0), 0);
            return { ...p, completionPercentage, spent };
        });
        setProjects(processedProjects);
    }, []);

    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === ProjectStatus.Completed).length;
    const inProgressProjects = projects.filter(p => p.status === ProjectStatus.InProgress).length;

    const { totalBudget, totalSpent } = useMemo(() => {
        return projects.reduce((acc, p) => {
            acc.totalBudget += p.budget;
            acc.totalSpent += p.spent;
            return acc;
        }, { totalBudget: 0, totalSpent: 0 });
    }, [projects]);


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-base-content">Admin Dashboard</h2>
                <button 
                  onClick={() => setActivePage('Projects')}
                  className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors duration-300 flex items-center">
                    + New Project
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ProjectOverviewCard 
                    title="Total Projects" 
                    value={totalProjects} 
                    icon={<FolderIcon className="w-8 h-8"/>} 
                    color="text-blue-500"
                />
                <ProjectOverviewCard 
                    title="In Progress" 
                    value={inProgressProjects} 
                    icon={<ClockIcon className="w-8 h-8"/>} 
                    color="text-yellow-500"
                />
                 <ProjectOverviewCard 
                    title="Completed" 
                    value={completedProjects} 
                    icon={<CheckCircleIcon className="w-8 h-8"/>}
                    color="text-green-500" 
                />
                <FinancialSummaryCard 
                    totalBudget={totalBudget}
                    totalSpent={totalSpent}
                />
            </div>
            
            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <ProjectStatusChart projects={projects} />
                </div>
                <div className="space-y-6">
                    <UpcomingDeadlines projects={projects} />
                </div>
            </div>
             <div className="grid grid-cols-1">
                <RecentActivity activities={mockActivities} />
            </div>
        </div>
    );
};

export default Dashboard;