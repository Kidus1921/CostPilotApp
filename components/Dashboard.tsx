
import React, { useMemo, useState, useEffect } from 'react';
import { ProjectStatus } from '../types';
import { useAppContext } from '../AppContext';
import ProjectOverviewCard from './ProjectOverviewCard';
import FinancialSummaryCard from './FinancialSummaryCard';
import UpcomingDeadlines from './UpcomingDeadlines';
import ProjectStatusChart from './ProjectStatusChart';
import { CheckCircleIcon, ClockIcon, FolderIcon, BellIcon } from './IconComponents';
import { subscribeToSendPulse } from '../services/sendPulseService';

const Dashboard: React.FC<{setActivePage: (page: string) => void}> = ({setActivePage}) => {
    const { projects } = useAppContext();
    const [showSubscribeBanner, setShowSubscribeBanner] = useState(false);
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        // Check if we should show the banner
        if (Notification.permission === 'default') {
            setShowSubscribeBanner(true);
        }
    }, []);

    const handleSubscribe = async () => {
        setSubscribing(true);
        try {
            const result = await subscribeToSendPulse();
            if (result.success) {
                setShowSubscribeBanner(false);
                alert("You have successfully subscribed to push notifications!");
            } else {
                alert(result.message);
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred while subscribing.");
        } finally {
            setSubscribing(false);
        }
    };

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

            {showSubscribeBanner && (
                <div className="bg-gradient-to-r from-brand-primary to-teal-800 rounded-xl shadow-lg p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full">
                            <BellIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Don't miss a beat!</h3>
                            <p className="text-white/90 text-sm">Enable push notifications to get real-time updates on project approvals, deadlines, and cost overruns.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                         <button 
                            onClick={handleSubscribe} 
                            disabled={subscribing}
                            className="bg-white text-brand-primary font-bold py-2 px-6 rounded-lg shadow hover:bg-gray-100 transition-colors whitespace-nowrap w-full sm:w-auto"
                        >
                            {subscribing ? 'Enabling...' : 'Enable Notifications'}
                        </button>
                        <button 
                            onClick={() => setShowSubscribeBanner(false)}
                            className="bg-transparent border border-white/30 text-white font-bold py-2 px-4 rounded-lg hover:bg-white/10 transition-colors w-full sm:w-auto"
                        >
                            Later
                        </button>
                    </div>
                </div>
            )}

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
