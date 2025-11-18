import React from 'react';
import { Notification, NotificationType } from '../../types';
import { BellIcon, CheckCircleIcon, FolderIcon, FinanceIcon } from '../IconComponents';
import { markNotificationAsRead } from '../../services/notificationService';

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
    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead && notification.id) {
            markNotificationAsRead(notification.id);
        }
        // TODO: Handle navigation using notification.link
        onClose();
    };

    const recentNotifications = notifications.slice(0, 5);

    return (
        <div className="absolute top-full right-0 mt-4 w-80 sm:w-96 bg-base-100 rounded-xl shadow-2xl border border-base-300 dark:bg-gray-800 dark:border-gray-700 z-20">
            <div className="p-4 border-b border-base-200 dark:border-gray-700">
                <h3 className="font-bold text-lg text-base-content dark:text-white">Notifications</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {recentNotifications.length > 0 ? (
                    recentNotifications.map(notif => (
                        <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className="flex items-start gap-4 p-4 hover:bg-base-200 dark:hover:bg-gray-700/50 cursor-pointer border-b border-base-200 dark:border-gray-700/50"
                        >
                            <NotificationIcon type={notif.type} />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-base-content dark:text-gray-100">{notif.title}</p>
                                <p className="text-sm text-base-content-secondary dark:text-gray-400">{notif.message}</p>
                                <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
                                    {notif.timestamp ? timeSince(notif.timestamp.toDate()) : '...'}
                                </p>
                            </div>
                            {!notif.isRead && (
                                <div className="w-2.5 h-2.5 bg-brand-primary rounded-full flex-shrink-0 mt-1" title="Unread"></div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center p-8 text-base-content-secondary dark:text-gray-400">
                        <BellIcon className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        You're all caught up!
                    </div>
                )}
            </div>
            <div className="p-2 bg-base-200/50 dark:bg-gray-800/50">
                <button
                    onClick={onViewAll}
                    className="w-full text-center py-2 text-sm font-bold text-brand-primary hover:bg-teal-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    View All Notifications
                </button>
            </div>
        </div>
    );
};

export default NotificationPanel;
