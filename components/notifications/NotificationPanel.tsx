
import React, { useState } from 'react';
import { Notification, NotificationType } from '../../types';
import { BellIcon, CheckCircleIcon, FolderIcon, FinanceIcon, TrashIcon, ClockIcon, CheckIcon } from '../IconComponents';
import { markNotificationAsRead, deleteNotification } from '../../services/notificationService';
import { supabase } from '../../supabaseClient';
import { useAppContext } from '../../AppContext';

const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    const iconMap = {
        [NotificationType.ApprovalRequest]: <FolderIcon className="w-5 h-5 text-yellow-500" />,
        [NotificationType.ApprovalResult]: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
        [NotificationType.CostOverrun]: <FinanceIcon className="w-5 h-5 text-red-500" />,
        [NotificationType.TaskUpdate]: <CheckIcon className="w-5 h-5 text-blue-500" />,
        [NotificationType.System]: <BellIcon className="w-5 h-5 text-indigo-500" />,
        [NotificationType.Deadline]: <ClockIcon className="w-5 h-5 text-orange-500" />,
    };
    return <div className="flex-shrink-0">{iconMap[type]}</div>;
};

interface NotificationPanelProps {
    notifications: Notification[];
    onClose: () => void;
    onViewAll: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose, onViewAll }) => {
    const { currentUser, refreshData, setActivePage } = useAppContext();
    const [isClearing, setIsClearing] = useState(false);
    const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

    const handleNotificationClick = async (n: Notification) => {
        if (!n.isRead && n.id) {
            await markNotificationAsRead(n.id);
            refreshData();
        }

        if (n.link && n.link.startsWith('/projects/')) {
            const projectId = n.link.replace('/projects/', '');
            if (projectId) {
                (window as any).nextProjectIdToOpen = projectId;
                setActivePage?.('Projects');
                onClose();
                return;
            }
        }

        if (n.type === NotificationType.ApprovalRequest) {
            setActivePage?.('Financials', 'Approvals');
        } else if (n.link === '/financials') {
            setActivePage?.('Financials');
        }
        
        onClose();
    };

    const handleDismiss = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDismissingIds(prev => new Set(prev).add(id));
        
        // Wait for animation to finish
        setTimeout(async () => {
            await deleteNotification(id);
            refreshData();
            setDismissingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, 300);
    };

    const handleClearAll = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser || notifications.length === 0) return;
        if (!confirm("Clear all notifications from registry?")) return;
        
        setIsClearing(true);
        // Animate all out
        const allIds = notifications.map(n => n.id!).filter(Boolean);
        setDismissingIds(new Set(allIds));

        try {
            const { error } = await supabase.from('notifications').delete().eq('userId', currentUser.id);
            if (error) throw error;
            
            setTimeout(() => {
                refreshData();
                setIsClearing(false);
                setDismissingIds(new Set());
            }, 400);
        } catch (err) {
            console.error(err);
            setIsClearing(false);
            setDismissingIds(new Set());
        }
    };

    const recentNotifications = notifications.slice(0, 5);
    const panelBg = "bg-base-100 text-base-content dark:bg-[#111111] dark:text-white";
    const itemHover = "hover:bg-base-200 dark:hover:bg-white/5";

    return (
        <div className={`absolute top-full right-0 mt-4 w-80 sm:w-96 rounded-2xl shadow-2xl border border-base-300 dark:border-white/10 z-[100] ${panelBg} animate-fadeIn overflow-hidden`}>
            <div className="p-4 border-b border-base-200 dark:border-white/5 flex justify-between items-center bg-base-200/20">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs uppercase tracking-[0.2em]">Live Registry</h3>
                    <span className="bg-brand-primary/10 text-brand-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {notifications.length}
                    </span>
                </div>
                {notifications.length > 0 && (
                    <button 
                        onClick={handleClearAll}
                        disabled={isClearing}
                        className="text-[10px] font-bold text-brand-tertiary uppercase hover:bg-brand-tertiary/10 px-2 py-1 rounded transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                        <TrashIcon className="w-3 h-3" /> {isClearing ? 'Clearing...' : 'Clear All'}
                    </button>
                )}
            </div>
            
            <div className="max-h-[28rem] overflow-y-auto custom-scrollbar overflow-x-hidden">
                {recentNotifications.length > 0 ? (
                    recentNotifications.map(notif => {
                        const date = notif.timestamp ? (notif.timestamp.toDate ? notif.timestamp.toDate() : new Date(notif.timestamp)) : new Date();
                        const isDismissing = dismissingIds.has(notif.id!);
                        
                        return (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`
                                    relative flex items-start gap-4 p-4 cursor-pointer border-b border-base-200 dark:border-white/5 transition-all duration-300 transform
                                    ${itemHover} 
                                    ${!notif.isRead ? 'bg-brand-primary/5' : ''}
                                    ${isDismissing ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
                                `}
                                style={{ maxHeight: isDismissing ? '0px' : '200px', padding: isDismissing ? '0px' : '' }}
                            >
                                <NotificationIcon type={notif.type} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className={`text-sm truncate ${!notif.isRead ? 'font-bold' : 'font-medium text-gray-500 dark:text-gray-400'}`}>
                                            {notif.title}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap ml-2">
                                            {timeSince(date)}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                                        {notif.message}
                                    </p>
                                </div>
                                
                                {/* Hover Dismiss Button / Simulated Swipe Action */}
                                <button 
                                    onClick={(e) => handleDismiss(e, notif.id!)}
                                    className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-tertiary/10 text-brand-tertiary rounded-full hover:bg-brand-tertiary hover:text-white transition-all shadow-sm"
                                    title="Dismiss"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>

                                {!notif.isRead && !isDismissing && (
                                    <div className="w-1.5 h-1.5 bg-brand-primary rounded-full flex-shrink-0 mt-1.5 shadow-[0_0_8px_rgba(211,162,0,0.5)] animate-pulse"></div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center p-12 text-gray-400 animate-fadeIn">
                        <div className="w-16 h-16 bg-base-200 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-base-300 dark:border-white/10">
                            <BellIcon className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest">Inbox Clean</p>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase">No active alerts in registry</p>
                    </div>
                )}
            </div>
            
            <div className="p-3 bg-base-200/50 dark:bg-black/20 border-t border-base-200 dark:border-white/5">
                <button
                    onClick={onViewAll}
                    className="w-full text-center py-2.5 text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] hover:bg-brand-primary hover:text-white rounded-xl transition-all border border-brand-primary/20 bg-brand-primary/5"
                >
                    View Operational Feed
                </button>
            </div>
        </div>
    );
};

export default NotificationPanel;
