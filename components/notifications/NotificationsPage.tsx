
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { supabase } from '../../supabaseClient';
import { Notification, NotificationPriority, NotificationType } from '../../types';
import { createNotification, deleteNotification, markNotificationAsRead } from '../../services/notificationService';
import { BellIcon, CheckCircleIcon, FinanceIcon, FolderIcon, TrashIcon, SettingsIcon, CheckIcon, ClockIcon } from '../IconComponents';

const getTimeGroup = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && now.getDate() === date.getDate()) return 'Today';
    if (diffHours < 48 && now.getDate() - date.getDate() === 1) return 'Yesterday';
    return 'Older';
};

const timeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
};

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    const iconMap = {
        [NotificationType.ApprovalRequest]: <FolderIcon className="w-5 h-5 text-yellow-600" />,
        [NotificationType.ApprovalResult]: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
        [NotificationType.CostOverrun]: <FinanceIcon className="w-5 h-5 text-red-600" />,
        [NotificationType.TaskUpdate]: <CheckIcon className="w-5 h-5 text-blue-600" />,
        [NotificationType.System]: <BellIcon className="w-5 h-5 text-indigo-600" />,
        [NotificationType.Deadline]: <ClockIcon className="w-5 h-5 text-orange-600" />,
    };
    return <div className={`p-2 rounded-full bg-base-100 border border-base-200 shadow-sm dark:bg-gray-700 dark:border-gray-600`}>{iconMap[type]}</div>;
};

const NotificationsPage: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
    const { currentUser, notifications, refreshData } = useAppContext();
    const [filterType, setFilterType] = useState<string>('All');

    if (!currentUser) return null;

    const handleRead = async (id: string) => { await markNotificationAsRead(id); refreshData(); };
    const handleDelete = async (id: string) => { await deleteNotification(id); refreshData(); };
    const markAll = async () => { await supabase.from('notifications').update({ isRead: true }).eq('userId', currentUser.id); refreshData(); };

    const groupedNotifications = useMemo(() => {
        const filtered = filterType === 'All' ? notifications : notifications.filter(n => n.type === filterType);
        
        return filtered.reduce((groups, n) => {
            const date = n.timestamp ? n.timestamp.toDate() : new Date();
            const group = getTimeGroup(date);
            if (!groups[group]) groups[group] = [];
            groups[group].push(n);
            return groups;
        }, {} as Record<string, Notification[]>);
    }, [notifications, filterType]);

    const groupOrder = ['Today', 'Yesterday', 'Older'];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold dark:text-white">Inbox</h2>
                    <p className="text-gray-500 text-sm dark:text-gray-400">Stay updated on your projects and tasks.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onOpenSettings} className="flex items-center gap-2 bg-base-200 text-base-content py-2 px-4 rounded-lg hover:bg-base-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <SettingsIcon className="w-5 h-5"/> Settings
                    </button>
                    <button onClick={markAll} className="flex items-center gap-2 bg-brand-primary text-white py-2 px-4 rounded-lg shadow hover:bg-teal-700 transition-colors">
                        <CheckIcon className="w-5 h-5"/> Mark all read
                    </button>
                </div>
            </div>

            {groupOrder.map(group => {
                const groupNotifs = groupedNotifications[group] || [];
                if (groupNotifs.length === 0) return null;

                return (
                    <div key={group} className="animate-fadeIn">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1 dark:text-gray-400">{group}</h3>
                        <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                            <ul className="divide-y divide-base-200 dark:divide-gray-700">
                                {groupNotifs.map(n => (
                                    <li key={n.id} className={`p-4 flex gap-4 transition-colors hover:bg-base-200/50 dark:hover:bg-gray-700/30 ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                        <NotificationIcon type={n.type} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm ${!n.isRead ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                                                    {n.title}
                                                </h4>
                                                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                    {n.timestamp ? timeSince(n.timestamp.toDate()) : ''}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                                        </div>
                                        <div className="flex items-center gap-2 self-center">
                                            {!n.isRead && (
                                                <button onClick={() => handleRead(n.id!)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors dark:text-blue-400 dark:hover:bg-blue-900/30" title="Mark as read">
                                                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full dark:bg-blue-400"></div>
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(n.id!)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors dark:hover:bg-red-900/30" title="Delete">
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            })}

            {Object.keys(groupedNotifications).length === 0 && (
                <div className="text-center py-16 bg-base-100 rounded-xl border border-dashed border-gray-300 dark:bg-gray-800 dark:border-gray-700">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 dark:bg-gray-700">
                        <BellIcon className="w-6 h-6 text-gray-400"/>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No notifications</h3>
                    <p className="text-gray-500 dark:text-gray-400">You're all caught up!</p>
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
