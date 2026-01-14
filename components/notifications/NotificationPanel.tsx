
import React, { useState } from 'react';
import { Notification, NotificationType } from '../../types';
import { BellIcon, CheckCircleIcon, FolderIcon, FinanceIcon, TrashIcon } from '../IconComponents';
import { markNotificationAsRead } from '../../services/notificationService';
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
        [NotificationType.ApprovalResult]: <FolderIcon className="w-5 h-5 text-green-500" />,
        [NotificationType.CostOverrun]: <FinanceIcon className="w-5 h-5 text-red-500" />,
        [NotificationType.TaskUpdate]: <CheckCircleIcon className="w-5 h-5 text-blue-500" />,
        [NotificationType.System]: <BellIcon className="w-5 h-5 text-indigo-500" />,
        [NotificationType.Deadline]: <BellIcon className="w-5 h-5 text-orange-500" />,
    };
    return <div className="flex-shrink-0">{iconMap[type]}</div>;
};

interface NotificationPanelProps {
    notifications: Notification[];
    onClose: () => void;
    onViewAll: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose, onViewAll }) => {
    const { currentUser, refreshData } = useAppContext();
    const [isClearing, setIsClearing] = useState(false);

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead && notification.id) {
            markNotificationAsRead(notification.id);
        }
        onClose();
    };

    const handleClearAll = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser || !confirm("Clear all notifications?")) return;
        setIsClearing(true);
        try {
            await supabase.from('notifications').delete().eq('userId', currentUser.id);
            refreshData();
        } catch (err) {
            console.error(err);
        } finally {
            setIsClearing(false);
        }
    };

    const recentNotifications = notifications.slice(0, 5);

    // Negative Colors: Light background on light theme, dark background on dark theme
    const panelBg = "bg-base-100 text-base-content dark:bg-[#111111] dark:text-white";
    const itemHover = "hover:bg-base-200 dark:hover:bg-white/5";

    return (
        <div className={`absolute top-full right-0 mt-4 w-80 sm:w-96 rounded-xl shadow-2xl border border-base-300 dark:border-white/10 z-[100] ${panelBg}`}>
            <div className="p-4 border-b border-base-200 dark:border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase tracking-widest">Inbox</h3>
                {notifications.length > 0 && (
                    <button 
                        onClick={handleClearAll}
                        disabled={isClearing}
                        className="text-[10px] font-bold text-brand-tertiary uppercase hover:bg-brand-tertiary/10 px-2 py-1 rounded transition-all flex items-center gap-1"
                    >
                        <TrashIcon className="w-3 h-3" /> {isClearing ? '...' : 'Clear All'}
                    </button>
                )}
            </div>
            <div className="max-h-96 overflow-y-auto">
                {recentNotifications.length > 0 ? (
                    recentNotifications.map(notif => (
                        <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`flex items-start gap-4 p-4 cursor-pointer border-b border-base-200 dark:border-white/5 transition-colors ${itemHover} ${!notif.isRead ? 'bg-brand-primary/5' : ''}`}
                        >
                            <NotificationIcon type={notif.type} />
                            <div className="flex-1">
                                <p className={`text-sm ${!notif.isRead ? 'font-bold' : 'font-medium text-gray-500 dark:text-gray-400'}`}>{notif.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{notif.message}</p>
                                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">
                                    {notif.timestamp ? timeSince(notif.timestamp.toDate()) : '...'}
                                </p>
                            </div>
                            {!notif.isRead && (
                                <div className="w-1.5 h-1.5 bg-brand-primary rounded-full flex-shrink-0 mt-1.5 shadow-[0_0_8px_rgba(211,162,0,0.5)]"></div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center p-12 text-gray-400">
                        <BellIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">Registry Clean</p>
                    </div>
                )}
            </div>
            <div className="p-3 bg-base-200/50 dark:bg-black/20">
                <button
                    onClick={onViewAll}
                    className="w-full text-center py-2.5 text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] hover:bg-brand-primary/10 rounded-lg transition-all border border-brand-primary/20"
                >
                    Expand Feed
                </button>
            </div>
        </div>
    );
};

export default NotificationPanel;
