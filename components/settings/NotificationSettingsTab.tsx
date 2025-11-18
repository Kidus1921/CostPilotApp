import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot, updateDoc, collection } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User, UserNotificationPreferences, NotificationPriority, Project } from '../../types';
import { BellIcon, EnvelopeIcon } from '../IconComponents';

const defaultPreferences: UserNotificationPreferences = {
    inApp: {
        taskUpdates: true,
        approvals: true,
        costOverruns: true,
        deadlines: true,
        system: true,
    },
    email: {
        taskUpdates: false,
        approvals: true,
        costOverruns: true,
        deadlines: true,
        system: false,
    },
    priorityThreshold: NotificationPriority.Low,
    projectSubscriptions: [],
};

const ToggleSwitch: React.FC<{
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}> = ({ label, enabled, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="text-base-content dark:text-gray-200">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={enabled} onChange={e => onChange(e.target.checked)} />
            <div className={`block w-14 h-8 rounded-full ${enabled ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enabled ? 'transform translate-x-6' : ''}`}></div>
        </div>
    </label>
);

const NotificationSettingsTab: React.FC = () => {
    const [preferences, setPreferences] = useState<UserNotificationPreferences>(defaultPreferences);
    const [projects, setProjects] = useState<Project[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved'>('loading');
    
    const currentUserId = 'u1'; // Hardcoded user ID

    useEffect(() => {
        if (!currentUserId) return;
        const userRef = doc(db, 'users', currentUserId);
        const unsubscribe = onSnapshot(userRef, (doc) => {
            const userData = doc.data() as User;
            setPreferences(userData.notificationPreferences || defaultPreferences);
            setStatus('idle');
        });
        
        const projectsUnsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
             setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
        });

        return () => {
            unsubscribe();
            projectsUnsubscribe();
        };
    }, [currentUserId]);

    const handleSave = async () => {
        if (!currentUserId) return;
        setStatus('saving');
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, { notificationPreferences: preferences });
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
    };

    const handleToggle = (category: 'inApp' | 'email', key: string, value: boolean) => {
        setPreferences(prev => ({
            ...prev,
            [category]: { ...prev[category], [key]: value }
        }));
    };
    
    const handleProjectSubscriptionToggle = (projectId: string) => {
        setPreferences(prev => {
            const subs = prev.projectSubscriptions || [];
            const newSubs = subs.includes(projectId)
                ? subs.filter(id => id !== projectId)
                : [...subs, projectId];
            return { ...prev, projectSubscriptions: newSubs };
        });
    };


    if (status === 'loading') return <div>Loading settings...</div>;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-base-100 dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-4 dark:text-white"><BellIcon /> In-App Notifications</h3>
                <div className="space-y-4">
                    <ToggleSwitch label="Task Updates" enabled={preferences.inApp.taskUpdates} onChange={val => handleToggle('inApp', 'taskUpdates', val)} />
                    <ToggleSwitch label="Approvals" enabled={preferences.inApp.approvals} onChange={val => handleToggle('inApp', 'approvals', val)} />
                    <ToggleSwitch label="Cost Overruns" enabled={preferences.inApp.costOverruns} onChange={val => handleToggle('inApp', 'costOverruns', val)} />
                </div>
            </div>

            <div className="bg-base-100 dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-4 dark:text-white"><EnvelopeIcon /> Email Notifications</h3>
                <div className="space-y-4">
                     <ToggleSwitch label="Task Updates" enabled={preferences.email.taskUpdates} onChange={val => handleToggle('email', 'taskUpdates', val)} />
                    <ToggleSwitch label="Approvals" enabled={preferences.email.approvals} onChange={val => handleToggle('email', 'approvals', val)} />
                    <ToggleSwitch label="Cost Overruns" enabled={preferences.email.costOverruns} onChange={val => handleToggle('email', 'costOverruns', val)} />
                    <ToggleSwitch label="Upcoming Deadlines" enabled={preferences.email.deadlines} onChange={val => handleToggle('email', 'deadlines', val)} />
                </div>
            </div>
            
             <div className="bg-base-100 dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold mb-4 dark:text-white">Project Subscriptions</h3>
                <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">Choose which projects you want to receive notifications for. If none are selected, you will receive notifications for all projects you are a member of.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
                    {projects.map(p => (
                        <label key={p.id} className="flex items-center p-2 rounded-md hover:bg-base-200 dark:hover:bg-gray-700 cursor-pointer">
                            <input type="checkbox" checked={preferences.projectSubscriptions.includes(p.id!)} onChange={() => handleProjectSubscriptionToggle(p.id!)} className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary border-gray-300 dark:bg-gray-800 dark:border-gray-500" />
                            <span className="ml-3 text-sm text-base-content dark:text-gray-200">{p.title}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={status === 'saving'} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400 transition-colors">
                    {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default NotificationSettingsTab;
