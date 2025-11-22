
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Project, ProjectStatus, User, Activity, TaskStatus, UserRole, UserStatus as AppUserStatus } from '../types';
import ProjectOverviewCard from './ProjectOverviewCard';
import FinancialSummaryCard from './FinancialSummaryCard';
import UpcomingDeadlines from './UpcomingDeadlines';
import ProjectStatusChart from './ProjectStatusChart';
import { CheckCircleIcon, ClockIcon, FolderIcon } from './IconComponents';


const Dashboard: React.FC<{setActivePage: (page: string) => void}> = ({setActivePage}) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const q = query(collection(db, "projects"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setError(null);
            const projectsData: Project[] = [];
            querySnapshot.forEach((doc) => {
                projectsData.push({ id: doc.id, ...doc.data() } as Project);
            });

            const processedProjects = projectsData.map(p => {
                const tasks = p.tasks || [];
                const spent = tasks.reduce((acc, task) => acc + (task.completionDetails?.actualCost || 0), 0);
                
                if (p.status === ProjectStatus.Completed) {
                    return { ...p, completionPercentage: 100, spent };
                }

                const completedTasks = tasks.filter(t => t.status === TaskStatus.Completed).length;
                const completionPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
                return { ...p, completionPercentage, spent };
            });

            setProjects(processedProjects);
            setLoading(false);
        }, (err) => {
            console.error("Dashboard data fetch error:", err);
            setError("Failed to load dashboard data. Please check your connection and permissions.");
            setLoading(false);
        });

        return () => unsubscribe();
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


    if (loading) {
        return <div className="text-center p-10">Loading Dashboard...</div>;
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
                <h2 className="text-3xl font-bold text-base-content dark:text-gray-100">Admin Dashboard</h2>
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
        </div>
    );
};

export default Dashboard;
