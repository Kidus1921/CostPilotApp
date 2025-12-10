
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { User, UserNotificationPreferences, NotificationPriority, UserRole } from '../../types';
import { ServerIcon, RefreshIcon, ChipIcon } from '../IconComponents';
import { subscribeToSendPulse, unsubscribeFromSendPulse, getPushSubscriptionStatus } from '../../services/sendPulseService';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [pushStatusMsg, setPushStatusMsg] = useState('');

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
                alert("Triggering local test... If you don't see a notification, check your OS Focus Assist settings.");
            }
        } else {
            alert("🚫 Notifications are blocked. Please allow them in your browser URL bar.");
        }
    };
    
    if (loading) return <div className="text-center p-10">Loading settings...</div>;
    if (error) return <div className="p-6 text-red-600 bg-red-50 rounded-lg">{error}</div>;
    if (!preferences) return null;

    const StatusDot: React.FC<{ active: boolean }> = ({ active }) => (
        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
    );

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

            {/* Notification Settings */}
            <div className="bg-base-100 dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Notification Settings</h3>
                
                <div className="bg-base-200 dark:bg-gray-700/50 rounded-xl p-6 flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Push Notifications</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Receive real-time alerts for tasks, approvals, and deadlines even when the app is closed.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={preferences.pushEnabled || false} 
                            onChange={e => handlePushToggle(e.target.checked)} 
                        />
                        <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/30 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                    </label>
                </div>
                
                {pushStatusMsg && (
                     <p className="mt-4 text-sm text-center font-medium text-brand-primary animate-pulse">{pushStatusMsg}</p>
                )}

                <div className="flex justify-end pt-6">
                     <button onClick={handleSave} disabled={status === 'saving'} className="bg-brand-primary text-brand-primary-content font-bold py-2 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:opacity-50 transition-colors">
                        {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Preferences'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettingsTab;
