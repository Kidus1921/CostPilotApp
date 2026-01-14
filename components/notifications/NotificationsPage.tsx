
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { supabase } from '../../supabaseClient';
import { Notification, NotificationType } from '../../types';
import { deleteNotification, markNotificationAsRead } from '../../services/notificationService';
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
    return <div className="p-2 rounded-full bg-base-100 border border-base-200 dark:bg-gray-900 dark:border-gray-700">{iconMap[type]}</div>;
};

const NotificationsPage: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
    const { currentUser, notifications, refreshData } = useAppContext();
    const [isClearing, setIsClearing] = useState(false);

    if (!currentUser) return null;

    const handleRead = async (id: string) => { await markNotificationAsRead(id); refreshData(); };
    const handleDelete = async (id: string) => { await deleteNotification(id); refreshData(); };
    const markAll = async () => { await supabase.from('notifications').update({ isRead: true }).eq('userId', currentUser.id); refreshData(); };

    const clearAll = async () => {
        if (!confirm("Delete all notifications?")) return;
        setIsClearing(true);
        try {
            await supabase.from('notifications').delete().eq('userId', currentUser.id);
            refreshData();
        } finally {
            setIsClearing(false);
        }
    };

    const groupedNotifications = useMemo(() => {
        return notifications.reduce((groups, n) => {
            const date = n.timestamp ? (n.timestamp.toDate ? n.timestamp.toDate() : new Date(n.timestamp)) : new Date();
            const group = getTimeGroup(date);
            if (!groups[group]) groups[group] = [];
            groups[group].push(n);
            return groups;
        }, {} as Record<string, Notification[]>);
    }, [notifications]);

    const groupOrder = ['Today', 'Yesterday', 'Older'];

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold dark:text-white uppercase tracking-tighter">Notifications</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={onOpenSettings} className="flex items-center gap-2 bg-base-100 py-2 px-4 rounded-xl border border-base-300 dark:bg-gray-800 dark:border-gray-700 font-bold text-xs uppercase tracking-widest transition-all">
                        <SettingsIcon className="w-4 h-4"/> Config
                    </button>
                    <button onClick={markAll} className="flex items-center gap-2 bg-base-100 text-brand-primary py-2 px-4 rounded-xl border border-brand-primary/20 dark:bg-brand-primary/5 font-bold text-xs uppercase tracking-widest transition-all">
                        <CheckIcon className="w-4 h-4"/> Mark Read
                    </button>
                    <button onClick={clearAll} disabled={notifications.length === 0 || isClearing} className="flex items-center gap-2 bg-brand-tertiary text-white py-2 px-4 rounded-xl shadow-lg disabled:opacity-30 font-bold text-xs uppercase tracking-widest">
                        <TrashIcon className="w-4 h-4"/> {isClearing ? 'Clearing...' : 'Clear All'}
                    </button>
                </div>
            </div>

            {groupOrder.map(group => {
                const groupNotifs = groupedNotifications[group] || [];
                if (groupNotifs.length === 0) return null;
                return (
                    <div key={group} className="animate-fadeIn">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">{group}</h3>
                        <div className="bg-base-100 dark:bg-[#111111] border border-base-300 dark:border-white/10 rounded-xl overflow-hidden">
                            <ul className="divide-y divide-base-200 dark:divide-white/5">
                                {groupNotifs.map(n => (
                                    <li key={n.id} className={`p-4 flex gap-4 transition-colors hover:bg-base-200/50 dark:hover:bg-white/5 ${!n.isRead ? 'bg-brand-primary/5 border-l-4 border-l-brand-primary' : ''}`}>
                                        <NotificationIcon type={n.type} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm ${!n.isRead ? 'font-bold dark:text-white' : 'font-medium text-gray-500'}`}>{n.title}</h4>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap ml-2">
                                                    {n.timestamp ? timeSince(n.timestamp.toDate ? n.timestamp.toDate() : new Date(n.timestamp)) : ''}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                                        </div>
                                        <div className="flex items-center gap-2 self-center">
                                            {!n.isRead && (
                                                <button onClick={() => handleRead(n.id!)} className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-full transition-all">
                                                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(n.id!)} className="p-2 text-gray-300 hover:text-brand-tertiary rounded-xl transition-all">
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
            {notifications.length === 0 && (
                <div className="text-center py-24 bg-base-100 dark:bg-[#111111] rounded-2xl border-2 border-dashed border-base-300 dark:border-white/5">
                    <BellIcon className="w-8 h-8 mx-auto mb-6 text-brand-primary opacity-50"/>
                    <h3 className="text-lg font-bold dark:text-white uppercase tracking-widest">Inbox Empty</h3>
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
