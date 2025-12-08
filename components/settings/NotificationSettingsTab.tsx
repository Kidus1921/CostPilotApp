
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { User, UserNotificationPreferences, NotificationPriority, Project, UserRole, NotificationType } from '../../types';
import { BellIcon, EnvelopeIcon, ServerIcon, WifiIcon, ChipIcon, MegaphoneIcon, RefreshIcon } from '../IconComponents';
import { subscribeToSendPulse, unsubscribeFromSendPulse, setSendPulseCredentials, getPushSubscriptionStatus } from '../../services/sendPulseService';
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [pushStatusMsg, setPushStatusMsg] = useState('');
    
    // Admin Broadcast State
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [healthCheckStatus, setHealthCheckStatus] = useState<'idle' | 'running' | 'completed'>('idle');
    const [isAdminOpen, setIsAdminOpen] = useState(false);

    // Diagnostics State
    const [diagnosticStatus, setDiagnosticStatus] = useState<any>(null);

    useEffect(() => {
        if (!currentUserId) return;

        const fetchUser = async () => {
            const { data, error } = await supabase.from('users').select('*').eq('id', currentUserId).single();
            if (error) {
                console.error("Failed to fetch user preferences:", error.message || error);
                setError("Could not load notification settings.");
            } else if (data) {
                const userData = data as User;
                
                const dbPrefs = (userData.notificationPreferences || {}) as Partial<UserNotificationPreferences>;
                const mergedPrefs: UserNotificationPreferences = {
                    ...defaultPreferences,
                    ...dbPrefs,
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
            setLoading(false);
        };

        fetchUser();
        runDiagnostics();

        const userSub = supabase.channel('notification_settings_user')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${currentUserId}` }, fetchUser)
            .subscribe();

        return () => {
            supabase.removeChannel(userSub);
        };
    }, [currentUserId]);

    const runDiagnostics = async () => {
        const status = await getPushSubscriptionStatus(currentUser.id!);
        setDiagnosticStatus(status);
    };

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
        setPreferences(prev => prev ? ({ ...prev, pushEnabled: isChecked }) : null);
        setStatus('idle'); 

        if (isChecked) {
             try {
                 setPushStatusMsg("Requesting permission...");
                 const result = await subscribeToSendPulse();
                 setPushStatusMsg(result.message);
                 if (!result.success) {
                     setPreferences(prev => prev ? ({ ...prev, pushEnabled: false }) : null);
                 }
                 runDiagnostics();
             } catch (e) {
                 console.error(e);
                 setPushStatusMsg("Error connecting to push service.");
             }
        } else {
            unsubscribeFromSendPulse();
            setPushStatusMsg("Notifications disabled.");
        }
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
            // Native check
             new Notification("CostPilot", {
                body: "Local test successful.",
            });
            
            // Server check logic here if needed
            if (preferences?.pushEnabled && currentUser.id) {
                // We can't trigger a real server push from client without an Edge Function or exposing keys,
                // but we can simulate the "Diagnostic" check.
                alert("Triggering local test... If you don't see a notification, check your OS Focus Assist settings.");
            }
        } else {
            alert("🚫 Notifications are blocked. Please allow them in your browser URL bar.");
        }
    };

    const handleAdminBroadcast = async () => {
        if (!broadcastTitle || !broadcastMessage) return;
        setBroadcastStatus('sending');
        try {
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
            alert(`Broadcast queued for ${count} users.`);
        } catch (e) {
            console.error("Broadcast failed", e);
            setBroadcastStatus('idle');
            alert("Broadcast failed.");
        }
    };
    
    const handleRunHealthChecks = async () => {
        setHealthCheckStatus('running');
        await runSystemHealthChecks(true); 
        setHealthCheckStatus('completed');
        setTimeout(() => setHealthCheckStatus('idle'), 3000);
    };
    
    if (loading) return <div className="text-center p-10">Loading settings...</div>;
    if (error) return <div className="p-6 text-red-600 bg-red-50 rounded-lg">{error}</div>;
    if (!preferences) return null;

    const StatusDot: React.FC<{ active: boolean }> = ({ active }) => (
        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
    );

    const notificationTypes = [
        { key: 'taskUpdates', label: 'Task Updates' },
        { key: 'approvals', label: 'Approvals & Rejections' },
        { key: 'costOverruns', label: 'Cost Overruns' },
        { key: 'deadlines', label: 'Upcoming Deadlines' },
        { key: 'system', label: 'System Announcements' },
    ];
    
    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            {/* Diagnostics Card */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><ChipIcon className="w-32 h-32"/></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2"><ServerIcon className="w-5 h-5"/> Connection Diagnostics</h3>
                        <p className="text-gray-400 text-sm mt-1">Real-time status of your push notification pipeline.</p>
                        
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            <div className="flex items-center"><StatusDot active={diagnosticStatus?.permission === 'granted'} /> Browser Permission</div>
                            <div className="flex items-center"><StatusDot active={diagnosticStatus?.sdkLoaded} /> SendPulse SDK Loaded</div>
                            <div className="flex items-center"><StatusDot active={diagnosticStatus?.serviceWorker} /> Service Worker Active</div>
                            <div className="flex items-center"><StatusDot active={diagnosticStatus?.dbLinked} /> Database Linked</div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button onClick={runDiagnostics} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"><RefreshIcon className="w-4 h-4"/> Refresh</button>
                        <button onClick={handleTestNotification} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-colors">Test My Device</button>
                    </div>
                </div>
            </div>

            {/* General Channels */}
            <div className="bg-base-100 dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-md">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Notification Channels</h3>
                    <label className="flex items-center cursor-pointer">
                        <span className="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">Push Notifications</span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only peer" checked={preferences.pushEnabled || false} onChange={e => handlePushToggle(e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                        </div>
                    </label>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 italic">{pushStatusMsg || 'Toggle push to receive alerts even when the app is closed.'}</p>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Type</th>
                                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-500 dark:text-gray-400"><BellIcon className="w-5 h-5 mx-auto"/> In-App</th>
                                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-500 dark:text-gray-400"><EnvelopeIcon className="w-5 h-5 mx-auto"/> Email</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                             {notificationTypes.map(({ key, label }) => (
                                <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-gray-100">{label}</td>
                                    <td className="py-4 px-4 text-center">
                                        <input type="checkbox" className="h-5 w-5 rounded text-brand-primary focus:ring-brand-primary cursor-pointer" checked={preferences.inApp ? preferences.inApp[key as keyof typeof preferences.inApp] : false} onChange={e => handlePreferenceChange('inApp', key, e.target.checked)} />
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <input type="checkbox" className="h-5 w-5 rounded text-brand-primary focus:ring-brand-primary cursor-pointer" checked={preferences.email ? preferences.email[key as keyof typeof preferences.email] : false} onChange={e => handlePreferenceChange('email', key, e.target.checked)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Priority Threshold</h4>
                    <p className="text-xs text-gray-500 mb-2">Only receive notifications at or above this level.</p>
                    <select value={preferences.priorityThreshold} onChange={handlePriorityChange} className="block w-full max-w-xs pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        {Object.values(NotificationPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <div className="flex justify-end pt-6">
                     <button onClick={handleSave} disabled={status === 'saving'} className="bg-brand-primary text-brand-primary-content font-bold py-2 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:opacity-50 transition-colors">
                        {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Preferences'}
                    </button>
                </div>
            </div>
            
            {/* Admin Tools */}
            {currentUserRole === UserRole.Admin && (
                 <div className="bg-base-100 dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                    <button onClick={() => setIsAdminOpen(!isAdminOpen)} className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                             <ChipIcon className="w-5 h-5 text-orange-500"/> Admin Tools
                        </h3>
                        <span className={`transform transition-transform ${isAdminOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    
                    {isAdminOpen && (
                        <div className="p-6 space-y-8 animate-fadeIn">
                             {/* Broadcast */}
                            <div>
                                <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><MegaphoneIcon className="w-5 h-5"/> Manual Broadcast</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <input type="text" placeholder="Client ID (Optional)" value={clientId} onChange={e => setClientId(e.target.value)} onBlur={handleCredentialsChange} className="input-sm border rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                                    <input type="password" placeholder="Client Secret (Optional)" value={clientSecret} onChange={e => setClientSecret(e.target.value)} onBlur={handleCredentialsChange} className="input-sm border rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                                </div>
                                <div className="space-y-3">
                                    <input type="text" placeholder="Notification Title" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
                                    <textarea placeholder="Message..." value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} rows={2} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
                                    <button onClick={handleAdminBroadcast} disabled={broadcastStatus !== 'idle'} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 w-full md:w-auto">
                                        {broadcastStatus === 'sending' ? 'Sending...' : 'Send Broadcast'}
                                    </button>
                                </div>
                            </div>
                            
                            <hr className="dark:border-gray-700"/>

                            {/* Health Check */}
                            <div>
                                <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><WifiIcon className="w-5 h-5"/> System Health Check</h4>
                                <p className="text-sm text-gray-500 mb-4">Force run daily checks for overdue projects and dead sessions.</p>
                                <button onClick={handleRunHealthChecks} disabled={healthCheckStatus === 'running'} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                    {healthCheckStatus === 'running' ? 'Running...' : 'Run Checks Now'}
                                </button>
                            </div>
                        </div>
                    )}
                 </div>
            )}
        </div>
    );
};

export default NotificationSettingsTab;
