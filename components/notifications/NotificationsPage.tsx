
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { supabase } from '../../supabaseClient';
import { Notification, NotificationPriority, NotificationType } from '../../types';
import { createNotification, deleteNotification, markNotificationAsRead } from '../../services/notificationService';
import { BellIcon, CheckCircleIcon, FinanceIcon, FolderIcon, TrashIcon, SettingsIcon } from '../IconComponents';

const timeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const NotificationsPage: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
    const { currentUser, notifications, refreshData } = useAppContext();
    const [filterType, setFilterType] = useState<string>('All');

    if (!currentUser) return null;

    const handleRead = async (id: string) => { await markNotificationAsRead(id); refreshData(); };
    const handleDelete = async (id: string) => { await deleteNotification(id); refreshData(); };
    const markAll = async () => { await supabase.from('notifications').update({ isRead: true }).eq('userId', currentUser.id); refreshData(); };

    const filtered = useMemo(() => filterType === 'All' ? notifications : notifications.filter(n => n.type === filterType), [notifications, filterType]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold dark:text-white">Notifications</h2>
                <div className="flex gap-2">
                    <button onClick={onOpenSettings} className="bg-gray-100 p-2 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-white"><SettingsIcon className="w-5 h-5"/></button>
                    <button onClick={markAll} className="bg-brand-primary text-white py-2 px-4 rounded shadow hover:bg-teal-700">Mark All Read</button>
                </div>
            </div>
            
            <div className="bg-base-100 rounded-xl shadow-md overflow-hidden dark:bg-gray-800">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filtered.map(n => (
                        <li key={n.id} className={`p-4 flex gap-4 ${!n.isRead ? 'bg-teal-50 dark:bg-teal-900/10' : ''}`}>
                            <div className="p-2 bg-gray-100 rounded-full h-fit dark:bg-gray-700"><BellIcon className="w-5 h-5 text-gray-500"/></div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h4 className="font-bold dark:text-white">{n.title}</h4>
                                    <span className="text-xs text-gray-500">{n.timestamp ? timeSince(n.timestamp.toDate()) : ''}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{n.message}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {!n.isRead && <button onClick={() => handleRead(n.id!)} className="text-green-500 hover:text-green-600"><CheckCircleIcon/></button>}
                                <button onClick={() => handleDelete(n.id!)} className="text-red-400 hover:text-red-500"><TrashIcon/></button>
                            </div>
                        </li>
                    ))}
                    {filtered.length === 0 && <li className="p-8 text-center text-gray-500">No notifications.</li>}
                </ul>
            </div>
        </div>
    );
};

export default NotificationsPage;
