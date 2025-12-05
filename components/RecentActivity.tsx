
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Activity } from '../types';
import { FolderIcon, CheckCircleIcon, ReportsIcon, FinanceIcon, UserGroupIcon, ArrowDownIcon } from './IconComponents';

type ActivityDisplayType = 'project' | 'task' | 'report' | 'finance' | 'user';

const getActivityType = (action: string): ActivityDisplayType => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('project')) return 'project';
    if (lowerAction.includes('task')) return 'task';
    if (lowerAction.includes('user') || lowerAction.includes('team') || lowerAction.includes('permissions')) return 'user';
    if (lowerAction.includes('expense')) return 'finance';
    return 'report'; // default
};

const ActivityIcon: React.FC<{ type: ActivityDisplayType }> = ({ type }) => {
    const iconMap = {
        project: <FolderIcon className="w-5 h-5 text-blue-500" />,
        task: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
        report: <ReportsIcon className="w-5 h-5 text-purple-500" />,
        finance: <FinanceIcon className="w-5 h-5 text-orange-500" />,
        user: <UserGroupIcon className="w-5 h-5 text-indigo-500" />,
    };
    const colorMap = {
        project: 'bg-blue-100 dark:bg-blue-900/50',
        task: 'bg-green-100 dark:bg-green-900/50',
        report: 'bg-purple-100 dark:bg-purple-900/50',
        finance: 'bg-orange-100 dark:bg-orange-900/50',
        user: 'bg-indigo-100 dark:bg-indigo-900/50',
    };
    return <div className={`flex items-center justify-center w-10 h-10 rounded-full ${colorMap[type]}`}>{iconMap[type]}</div>
};

const RecentActivity: React.FC = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(20);
    const [error, setError] = useState<string | null>(null);

    const fetchActivities = async () => {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Failed to fetch recent activity:", error);
            setError("Could not load activity feed.");
        } else if (data) {
            const activitiesData = data.map((d: any) => ({
                ...d,
                timestamp: d.timestamp ? { toDate: () => new Date(d.timestamp) } : null
            }));
            setActivities(activitiesData as Activity[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchActivities();

        const channel = supabase
            .channel('recent_activity')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, (payload) => {
                const newActivity = {
                    ...payload.new,
                    timestamp: { toDate: () => new Date(payload.new.timestamp) }
                } as Activity;
                setActivities(prev => [newActivity, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [limit]);

    const loadMore = () => {
        setLimit(prev => prev + 20);
    };

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'Just now';
        return timestamp.toDate().toLocaleString();
    };

    if (loading) {
        return <div className="text-center p-4">Loading Activity...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>;
    }

    return (
        <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
            <h3 className="text-lg font-bold text-base-content dark:text-white">Activity Log</h3>
            <div className="mt-6 flow-root">
                {activities.length > 0 ? (
                    <>
                        <ul role="list" className="-mb-8">
                            {activities.map((activity, activityIdx) => (
                                <li key={activity.id}>
                                    <div className="relative pb-8">
                                        {activityIdx !== activities.length - 1 ? (
                                            <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                                        ) : null}
                                        <div className="relative flex items-start space-x-3">
                                            <ActivityIcon type={getActivityType(activity.action)} />
                                            <div className="min-w-0 flex-1 pt-1.5">
                                                <div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">{activity.user?.name || 'Unknown'}</span>{' '}
                                                        {activity.action.toLowerCase()}{' '}
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">{activity.details}</span>
                                                    </p>
                                                </div>
                                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">{formatTimestamp(activity.timestamp)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8 text-center">
                            <button 
                                onClick={loadMore} 
                                className="text-sm font-semibold text-brand-primary hover:text-teal-700 flex items-center justify-center w-full gap-2 p-2 rounded-lg hover:bg-base-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ArrowDownIcon className="w-4 h-4" /> Load More Activity
                            </button>
                        </div>
                    </>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400">No recent activity recorded.</p>
                )}
            </div>
        </div>
    );
};

export default RecentActivity;
