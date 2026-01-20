
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { supabase } from '../../supabaseClient';
import { Notification, NotificationType } from '../../types';
import { deleteNotification, markNotificationAsRead, runSystemHealthChecks } from '../../services/notificationService';
import { BellIcon, CheckCircleIcon, FinanceIcon, FolderIcon, TrashIcon, SettingsIcon, CheckIcon, ClockIcon, RefreshIcon } from '../IconComponents';

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

interface NotificationsPageProps {
    onOpenSettings?: () => void;
    setActivePage?: (page: string, subTab?: string) => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ onOpenSettings, setActivePage }) => {
    const { currentUser, notifications, refreshData } = useAppContext();
    const [isClearing, setIsClearing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    if (!currentUser) return null;

    const handleRead = async (id: string) => { 
        await markNotificationAsRead(id); 
        refreshData(); 
    };

    const handleNotificationClick = async (n: Notification) => {
        if (!n.isRead && n.id) {
            await handleRead(n.id);
        }

        if (n.link && n.link.startsWith('/projects/')) {
            const projectId = n.link.replace('/projects/', '');
            if (projectId) {
                (window as any).nextProjectIdToOpen = projectId;
                setActivePage?.('Projects');
                return;
            }
        }

        if (n.type === NotificationType.ApprovalRequest) {
            setActivePage?.('Financials', 'Approvals');
        } else if (n.link === '/financials') {
            setActivePage?.('Financials');
        }
    };

    const handleDelete = async (id: string) => { await deleteNotification(id); refreshData(); };
    
    const markAll = async () => { 
        await supabase.from('notifications').update({ isRead: true }).eq('userId', currentUser.id); 
        refreshData(); 
    };

    const handleSync = async () => {
        setIsSyncing(true);
        await runSystemHealthChecks();
        await refreshData();
        setIsSyncing(false);
    };

    const clearAll = async () => {
        if (!confirm("Clear all notifications from registry?")) return;
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-100 dark:bg-[#111111] p-4 rounded-2xl border border-base-300 dark:border-white/10">
                <h2 className="text-xl font-bold dark:text-white uppercase tracking-tighter">Notifications</h2>
                
                <div className="flex flex-wrap items-center gap-2">
                    <button 
                        onClick={handleSync} 
                        disabled={isSyncing} 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-200 dark:bg-white/5 hover:bg-base-300 dark:hover:bg-white/10 transition-colors text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                        <RefreshIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}/> Sync Alerts
                    </button>
                    
                    <button 
                        onClick={onOpenSettings} 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-200 dark:bg-white/5 hover:bg-base-300 dark:hover:bg-white/10 transition-colors text-[10px] font-bold uppercase tracking-widest"
                    >
                        <SettingsIcon className="w-3.5 h-3.5"/> Config
                    </button>
                    
                    <button 
                        onClick={markAll} 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20 transition-colors text-[10px] font-bold uppercase tracking-widest"
                    >
                        <CheckIcon className="w-3.5 h-3.5"/> Mark Read
                    </button>
                    
                    <button 
                        onClick={clearAll} 
                        disabled={notifications.length === 0 || isClearing} 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-tertiary/10 text-brand-tertiary border border-brand-tertiary/20 hover:bg-brand-tertiary/20 transition-colors text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                    >
                        <TrashIcon className="w-3.5 h-3.5"/> {isClearing ? '...' : 'Clear All'}
                    </button>
                </div>
            </div>

            {groupOrder.map(group => {
                const groupNotifs = groupedNotifications[group] || [];
                if (groupNotifs.length === 0) return null;
                return (
                    <div key={group} className="animate-fadeIn">
                        <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">{group}</h3>
                        <div className="bg-base-100 dark:bg-[#111111] border border-base-300 dark:border-white/10 rounded-xl overflow-hidden">
                            <ul className="divide-y divide-base-200 dark:divide-white/5">
                                {groupNotifs.map(n => (
                                    <li 
                                        key={n.id} 
                                        onClick={() => handleNotificationClick(n)}
                                        className={`p-4 flex gap-4 transition-colors cursor-pointer hover:bg-base-200/50 dark:hover:bg-white/5 ${!n.isRead ? 'bg-brand-primary/5' : ''}`}
                                    >
                                        <NotificationIcon type={n.type} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm ${!n.isRead ? 'font-bold dark:text-white' : 'font-medium text-gray-500'}`}>{n.title}</h4>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap ml-2">
                                                    {n.timestamp ? timeSince(n.timestamp.toDate ? n.timestamp.toDate() : new Date(n.timestamp)) : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                                        </div>
                                        <div className="flex items-center gap-2 self-center">
                                            {!n.isRead && (
                                                <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(211,162,0,0.5)]"></div>
                                            )}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(n.id!); }} 
                                                className="p-2 text-gray-300 hover:text-brand-tertiary rounded-xl transition-all"
                                            >
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
                    <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest">Registry Clean</h3>
                    <p className="text-[10px] text-gray-500 uppercase mt-2">No active operational alerts</p>
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
