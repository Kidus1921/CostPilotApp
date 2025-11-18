import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Activity } from '../types';
import { FolderIcon, CheckCircleIcon, ReportsIcon, FinanceIcon, UserGroupIcon } from './IconComponents';

type ActivityDisplayType = 'project' | 'task' | 'report' | 'finance' | 'user';

const getActivityType = (action: string): ActivityDisplayType => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('project')) return 'project';
    if (lowerAction.includes('task')) return 'task';
    if (lowerAction.includes('user') || lowerAction.includes('team')) return 'user';
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

    useEffect(() => {
        const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(20));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const activitiesData: Activity[] = [];
            querySnapshot.forEach((doc) => {
                activitiesData.push({ id: doc.id, ...doc.data() } as Activity);
            });
            setActivities(activitiesData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'Just now';
        return timestamp.toDate().toLocaleString();
    };

    if (loading) {
        return <div className="text-center p-4">Loading Activity...</div>;
    }

    return (
        <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
            <h3 className="text-lg font-bold text-base-content dark:text-white">Recent Activity</h3>
            <div className="mt-4 flow-root">
                {activities.length > 0 ? (
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
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{activity.user.name}</span>{' '}
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
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400">No recent activity recorded.</p>
                )}
            </div>
        </div>
    );
};

export default RecentActivity;