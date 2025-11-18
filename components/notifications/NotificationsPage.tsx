import React, { useState, useEffect, useMemo } from 'react';
// FIX: Import 'doc' from 'firebase/firestore' to resolve 'Cannot find name 'doc'' error.
import { collection, query, where, onSnapshot, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Notification, NotificationPriority, NotificationType } from '../../types';
import { createNotification, deleteNotification, markNotificationAsRead } from '../../services/notificationService';
import { BellIcon, CheckCircleIcon, FinanceIcon, FolderIcon, TrashIcon } from '../IconComponents';

const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    const iconMap = {
        [NotificationType.ApprovalRequest]: <FolderIcon className="w-6 h-6 text-yellow-500" />,
        [NotificationType.ApprovalResult]: <FolderIcon className="w-6 h-6 text-green-500" />,
        [NotificationType.CostOverrun]: <FinanceIcon className="w-6 h-6 text-red-500" />,
        [NotificationType.TaskUpdate]: <CheckCircleIcon className="w-6 h-6 text-blue-500" />,
        [NotificationType.System]: <BellIcon className="w-6 h-6 text-indigo-500" />,
        [NotificationType.Deadline]: <BellIcon className="w-6 h-6 text-orange-500" />,
    };
    return <div className="p-3 bg-gray-100 rounded-full dark:bg-gray-700/50">{iconMap[type]}</div>;
};

const PriorityBadge: React.FC<{ priority: NotificationPriority }> = ({ priority }) => {
    const colorMap = {
        [NotificationPriority.Low]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        [NotificationPriority.Medium]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [NotificationPriority.High]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [NotificationPriority.Critical]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colorMap[priority]}`}>{priority}</span>;
}


const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<NotificationType | 'All'>('All');
    const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'All'>('All');
    const [filterRead, setFilterRead] = useState<'All' | 'Read' | 'Unread'>('All');

    // Hardcoded current user ID. In a real app, this would come from an auth context.
    const currentUserId = 'u1';

    useEffect(() => {
        if (!currentUserId) return;
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', currentUserId)
            // orderBy('timestamp', 'desc') // Removed to prevent index error. Sorting is now done on the client.
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            
            // Sort on the client-side to avoid needing a composite index in Firestore
            notifs.sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                    return b.timestamp.toMillis() - a.timestamp.toMillis();
                }
                return 0;
            });
            
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            const typeMatch = filterType === 'All' || n.type === filterType;
            const priorityMatch = filterPriority === 'All' || n.priority === filterPriority;
            const readMatch = filterRead === 'All' || (filterRead === 'Read' && n.isRead) || (filterRead === 'Unread' && !n.isRead);
            return typeMatch && priorityMatch && readMatch;
        });
    }, [notifications, filterType, filterPriority, filterRead]);

    const handleMarkAllAsRead = async () => {
        const batch = writeBatch(db);
        notifications.forEach(n => {
            if (!n.isRead && n.id) {
                batch.update(doc(db, 'notifications', n.id), { isRead: true });
            }
        });
        await batch.commit();
    };
    
    const handleCreateCustomNotification = () => {
        // This is a placeholder for an admin feature to broadcast messages
        const title = prompt("Enter notification title:");
        const message = prompt("Enter notification message:");
        if (title && message) {
            createNotification({
                userId: currentUserId, // Or target specific users
                title,
                message,
                type: NotificationType.System,
                priority: NotificationPriority.Medium,
            })
        }
    };

    if (loading) return <div>Loading notifications...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-base-content dark:text-gray-100">Notifications</h2>
                <div className="flex gap-2">
                     <button onClick={handleCreateCustomNotification} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700">
                        Create Custom
                    </button>
                    <button onClick={handleMarkAllAsRead} className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">
                        Mark All as Read
                    </button>
                </div>
            </div>
            {/* Filters */}
            <div className="bg-base-100 p-4 rounded-xl shadow-md dark:bg-gray-800 flex flex-wrap gap-4">
                {/* Filter controls here */}
            </div>

            {/* Notification List */}
            <div className="bg-base-100 rounded-xl shadow-md dark:bg-gray-800 overflow-hidden">
                <ul className="divide-y divide-base-200 dark:divide-gray-700">
                    {filteredNotifications.length > 0 ? filteredNotifications.map(n => (
                        <li key={n.id} className={`flex items-start gap-4 p-4 sm:p-6 transition-colors ${!n.isRead ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''}`}>
                            <NotificationIcon type={n.type} />
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-base-content dark:text-gray-100">{n.title}</h4>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">{n.timestamp ? timeSince(n.timestamp.toDate()) : ''}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{n.message}</p>
                                <div className="mt-2 flex items-center gap-4">
                                    <PriorityBadge priority={n.priority} />
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{n.type}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                {!n.isRead && <button onClick={() => markNotificationAsRead(n.id!)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-green-500" title="Mark as read"><CheckCircleIcon /></button>}
                                <button onClick={() => deleteNotification(n.id!)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500" title="Delete"><TrashIcon /></button>
                            </div>
                        </li>
                    )) : (
                        <li className="text-center p-16 text-gray-500 dark:text-gray-400">
                            <BellIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-xl font-semibold">No Notifications</h3>
                            <p>You have no notifications that match the current filters.</p>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default NotificationsPage;