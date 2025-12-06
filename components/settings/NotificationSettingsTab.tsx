
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { User, UserNotificationPreferences, NotificationPriority, Project, UserRole, NotificationType } from '../../types';
import { BellIcon, EnvelopeIcon } from '../IconComponents';
import { subscribeToSendPulse, unsubscribeFromSendPulse, setSendPulseCredentials } from '../../services/sendPulseService';
import { createNotification, runSystemHealthChecks } from '../../services/notificationService';

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
        approvals: false,
        costOverruns: false,
        deadlines: false,
        system: false,
    },
    priorityThreshold: NotificationPriority.Medium,
    projectSubscriptions: [],
    pushEnabled: false
};

interface NotificationSettingsTabProps {
    currentUser: User;
}

const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({ currentUser }) => {
    const currentUserId = currentUser.id; 
    const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.ProjectManager);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [pushStatusMsg, setPushStatusMsg] = useState('');
    
    // Admin Broadcast State
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    
    // Credentials for SendPulse testing
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    
    const [healthCheckStatus, setHealthCheckStatus] = useState<'idle' | 'running' | 'completed'>('idle');

    useEffect(() => {
        if (!currentUserId) return;

        let userLoaded = false;
        let projectsLoaded = false;
        
        const checkLoading = () => {
            if (userLoaded && projectsLoaded) {
                setLoading(false);
            }
        };

        const fetchUser = async () => {
            const { data, error } = await supabase.from('users').select('*').eq('id', currentUserId).single();
            if (error) {
                console.error("Failed to fetch user preferences:", error.message || error);
                setError("Could not load notification settings.");
            } else if (data) {
                const userData = data as User;
                
                // Deep merge defaults with fetched data to handle empty/partial objects from DB
                const dbPrefs = (userData.notificationPreferences || {}) as Partial<UserNotificationPreferences>;
                const mergedPrefs: UserNotificationPreferences = {
                    ...defaultPreferences,
                    ...dbPrefs,
                    // Ensure nested objects exist
                    inApp: { ...defaultPreferences.inApp, ...(dbPrefs.inApp || {}) },
                    email: { ...defaultPreferences.email, ...(dbPrefs.email || {}) },
                    priorityThreshold: dbPrefs.priorityThreshold || defaultPreferences.priorityThreshold,
                    projectSubscriptions: dbPrefs.projectSubscriptions || defaultPreferences.projectSubscriptions,
                    pushEnabled: dbPrefs.pushEnabled !== undefined ? dbPrefs.pushEnabled : defaultPreferences.pushEnabled
                };

                setPreferences(mergedPrefs);
                setCurrentUserRole(userData.role);
            } else {
                 setPreferences(defaultPreferences);
            }
            userLoaded = true;
            checkLoading();
        };

        const fetchProjects = async () => {
             const { data, error } = await supabase.from('projects').select('*');
             if (error) {
                 console.error("Failed to fetch projects for subscriptions:", error);
                 setError("Could not load project list.");
             } else if (data) {
                 setProjects(data as Project[]);
             }
             projectsLoaded = true;
             checkLoading();
        };

        fetchUser();
        fetchProjects();

        const userSub = supabase.channel('notification_settings_user')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${currentUserId}` }, fetchUser)
            .subscribe();

        return () => {
            supabase.removeChannel(userSub);
        };
    }, [currentUserId]);

    const handlePreferenceChange = useCallback((category: 'inApp' | 'email', key: string, value: boolean) => {
        setPreferences(prev => {
            if (!prev) return null;
            const categoryObj = prev[category] || defaultPreferences[category];
            return {
                ...prev,
                [category]: {
                    ...categoryObj,
                    [key]: value,
                },
            };
        });
        setStatus('idle');
    }, []);
    
    const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPreferences(prev => prev ? ({ ...prev, priorityThreshold: e.target.value as NotificationPriority }) : null);
        setStatus('idle');
    };
    
    const handlePushToggle = async (isChecked: boolean) => {
        // 1. Optimistic Update
        setPreferences(prev => prev ? ({ ...prev, pushEnabled: isChecked }) : null);
        setStatus('idle'); 

        if (isChecked) {
             try {
                 setPushStatusMsg("Requesting permission...");
                 const result = await subscribeToSendPulse();
                 setPushStatusMsg(result.message);
                 if (!result.success) {
                     // Revert UI if failed
                     setPreferences(prev => prev ? ({ ...prev, pushEnabled: false }) : null);
                 }
             } catch (e) {
                 console.error(e);
                 setPushStatusMsg("Error connecting to push service.");
             }
        } else {
            unsubscribeFromSendPulse();
            setPushStatusMsg("Notifications disabled.");
        }
        
        // Clear message after 3s
        setTimeout(() => setPushStatusMsg(''), 3000);
    };

    const handleSave = async () => {
        if (!currentUserId || !preferences) return;
        setStatus('saving');
        try {
            const { error } = await supabase.from('users').update({ notificationPreferences: preferences }).eq('id', currentUserId);
            if (error) throw error;
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (err) {
            console.error("Failed to save preferences:", err);
            alert("Failed to save settings.");
            setStatus('idle');
        }
    };
    
    const handleCredentialsChange = () => {
        setSendPulseCredentials(clientId, clientSecret);
    };
    
    const handleTestNotification = async () => {
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === "granted") {
             new Notification("CostPilot", {
                body: "This is a local test. If you see this, your browser is allowing notifications.",
            });
        } else {
            alert("🚫 Notifications are blocked.\n\nPlease click the Lock icon in your address bar and Allow Notifications.");
        }
    };

    const handleAdminBroadcast = async () => {
        if (!broadcastTitle || !broadcastMessage) return;
        
        setBroadcastStatus('sending');
        
        try {
            console.log(`[Admin Broadcast] Title: ${broadcastTitle}, Msg: ${broadcastMessage}`);
            
            const { data: users } = await supabase.from('users').select('*');
            
            let count = 0;
            if (users) {
                for (const user of users) {
                    if (user.id) {
                        await createNotification({
                            userId: user.id,
                            title: broadcastTitle,
                            message: broadcastMessage,
                            type: NotificationType.System,
                            priority: NotificationPriority.High,
                        });
                        count++;
                    }
                }
            }
            
            setBroadcastStatus('sent');
            setBroadcastTitle('');
            setBroadcastMessage('');
            setTimeout(() => setBroadcastStatus('idle'), 3000);
            alert(`Broadcast created for ${count} users.\n\nSendPulse logs are in the console.`);

        } catch (e) {
            console.error("Broadcast failed", e);
            setBroadcastStatus('idle');
            alert("Broadcast failed.");
        }
    };
    
    const handleRunHealthChecks = async () => {
        setHealthCheckStatus('running');
        // Force run even if checks already ran today
        await runSystemHealthChecks(true); 
        setHealthCheckStatus('completed');
        setTimeout(() => setHealthCheckStatus('idle'), 3000);
        alert("System checks initiated. Check console for details on overdue projects and inactive users.");
    };
    
    if (loading) {
        return <div className="text-center p-10">Loading settings...</div>;
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                <h3 className="text-lg font-bold">An Error Occurred</h3>
                <p className="mt-2">{error}</p>
            </div>
        );
    }
    
    if (!preferences) return null;

    const notificationTypes = [
        { key: 'taskUpdates', label: 'Task Updates' },
        { key: 'approvals', label: 'Approvals & Rejections' },
        { key: 'costOverruns', label: 'Cost Overruns' },
        { key: 'deadlines', label: 'Upcoming Deadlines' },
        { key: 'system', label: 'System Announcements' },
    ];
    
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* General Channels */}
            <div className="bg-base-100 dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Notification Channels</h3>
                
                {/* Push Toggle */}
                <div className="flex items-center justify-between mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                    <div>
                        <h4 className="font-bold text-indigo-900 dark:text-indigo-200">Browser Push Notifications</h4>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-2">Receive instant alerts via SendPulse.</p>
                        <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500 italic">{pushStatusMsg}</span>
                            <button 
                                onClick={handleTestNotification}
                                className="text-xs bg-white border border-indigo-200 text-indigo-800 px-3 py-2 rounded hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-indigo-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                Test Local Alert
                            </button>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={preferences.pushEnabled || false}
                            onChange={e => handlePushToggle(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Choose specific categories for In-App and Email notifications.</p>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Notification Type</th>
                                <th className="py-2 px-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300"><BellIcon className="w-5 h-5 mx-auto"/> In-App</th>
                                <th className="py-2 px-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300"><EnvelopeIcon className="w-5 h-5 mx-auto"/> Email</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                             {notificationTypes.map(({ key, label }) => (
                                <tr key={key}>
                                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-gray-100">{label}</td>
                                    <td className="py-4 px-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded text-brand-primary focus:ring-brand-primary"
                                            checked={preferences.inApp ? preferences.inApp[key as keyof typeof preferences.inApp] : false}
                                            onChange={e => handlePreferenceChange('inApp', key, e.target.checked)}
                                        />
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded text-brand-primary focus:ring-brand-primary"
                                            checked={preferences.email ? preferences.email[key as keyof typeof preferences.email] : false}
                                            onChange={e => handlePreferenceChange('email', key, e.target.checked)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-base-100 dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-md">
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Advanced Settings</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                        <label htmlFor="priority-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Priority Level</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Only receive notifications at or above this level.</p>
                        <select
                            id="priority-threshold"
                            value={preferences.priorityThreshold}
                            onChange={handlePriorityChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {Object.values(NotificationPriority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                 </div>
            </div>
            
            {/* Admin Only: Manual Push Broadcast */}
            {currentUserRole === UserRole.Admin && (
                 <div className="space-y-6">
                    <div className="bg-base-100 dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-orange-500">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Admin: Broadcast Notification</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Send a manual alert to ALL users via In-App and SendPulse Push.</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">SendPulse Client ID</label>
                                <input 
                                    type="text" 
                                    placeholder="From SendPulse API Settings"
                                    value={clientId}
                                    onChange={e => setClientId(e.target.value)}
                                    onBlur={handleCredentialsChange}
                                    className="w-full px-3 py-1 text-sm border rounded-md bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">SendPulse Client Secret</label>
                                <input 
                                    type="password" 
                                    placeholder="From SendPulse API Settings"
                                    value={clientSecret}
                                    onChange={e => setClientSecret(e.target.value)}
                                    onBlur={handleCredentialsChange}
                                    className="w-full px-3 py-1 text-sm border rounded-md bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="Notification Title"
                                value={broadcastTitle}
                                onChange={e => setBroadcastTitle(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <textarea 
                                placeholder="Notification Message"
                                value={broadcastMessage}
                                onChange={e => setBroadcastMessage(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <button
                                onClick={handleAdminBroadcast}
                                disabled={broadcastStatus !== 'idle' || !broadcastTitle || !broadcastMessage}
                                className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                            >
                                {broadcastStatus === 'sending' ? 'Sending...' : broadcastStatus === 'sent' ? 'Sent!' : 'Send Broadcast'}
                            </button>
                        </div>
                    </div>
                    
                    {/* System Health Check Trigger */}
                     <div className="bg-base-100 dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-blue-500">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Admin: System Health Check</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Manually trigger daily checks for:
                            <ul className="list-disc list-inside mt-1 ml-2">
                                <li>Projects past their due date</li>
                                <li>Users inactive for more than 3 days</li>
                            </ul>
                        </p>
                        <button
                            onClick={handleRunHealthChecks}
                            disabled={healthCheckStatus === 'running'}
                            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {healthCheckStatus === 'running' ? 'Running Checks...' : healthCheckStatus === 'completed' ? 'Checks Completed' : 'Run Daily Checks Now'}
                        </button>
                     </div>
                 </div>
            )}

            <div className="flex justify-end pt-4 pb-10">
                 <button
                    onClick={handleSave}
                    disabled={status === 'saving'}
                    className="bg-brand-primary text-brand-primary-content font-bold py-2 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
                >
                    {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
};

export default NotificationSettingsTab;
