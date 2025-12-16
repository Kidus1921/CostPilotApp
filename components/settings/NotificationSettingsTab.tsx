
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, UserNotificationPreferences, NotificationPriority } from '../../types';
import { subscribeToSendPulse } from '../../services/sendPulseService';

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
                    // If DB says undefined, use default. If DB says true, keep true.
                    pushEnabled: dbPrefs.pushEnabled ?? false
                };

                setPreferences(mergedPrefs);
            } else {
                 setPreferences(defaultPreferences);
            }
            setLoading(false);
        };

        fetchUser();

        const userSub = supabase.channel('notification_settings_user')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${currentUserId}` }, fetchUser)
            .subscribe();

        return () => {
            supabase.removeChannel(userSub);
        };
    }, [currentUserId]);

    const handleToggle = (section: 'inApp' | 'email', key: string) => {
        if (!preferences) return;
        setPreferences({
            ...preferences,
            [section]: {
                ...preferences[section],
                [key as any]: !preferences[section][key as any]
            }
        });
    };

    const handlePushToggle = async () => {
        if (!preferences) return;
        
        const newValue = !preferences.pushEnabled;
        
        // If enabling, trigger subscription flow
        if (newValue) {
            setStatus('saving');
            const result = await subscribeToSendPulse(currentUserId);
            if (!result.success) {
                alert(result.message);
                setStatus('idle');
                return;
            }
            // If success, update pref state
            setPreferences({ ...preferences, pushEnabled: true });
            setStatus('idle');
        } else {
             setPreferences({ ...preferences, pushEnabled: false });
        }
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
    
    if (loading) return <div className="text-center p-10">Loading settings...</div>;
    if (error) return <div className="p-6 text-red-600 bg-red-50 rounded-lg">{error}</div>;
    if (!preferences) return null;

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div className="bg-base-100 dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Notification Settings</h3>
                
                {/* Push Notifications Toggle */}
                <div className="bg-base-200 dark:bg-gray-700/50 rounded-xl p-4 mb-6 flex items-center justify-between">
                    <div>
                         <h4 className="font-bold text-base-content dark:text-white">Push Notifications</h4>
                         <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts on your device even when the app is closed.</p>
                    </div>
                     <button 
                        onClick={handlePushToggle}
                        disabled={status === 'saving'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.pushEnabled ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.pushEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* In-App Notifications */}
                    <div>
                        <h4 className="font-bold text-lg mb-4 text-base-content dark:text-white flex items-center gap-2">In-App Notifications</h4>
                        <div className="space-y-3">
                            {Object.entries(preferences.inApp).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-gray-700 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <button 
                                        onClick={() => handleToggle('inApp', key)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Email Notifications */}
                    <div>
                        <h4 className="font-bold text-lg mb-4 text-base-content dark:text-white flex items-center gap-2">Email Notifications</h4>
                        <div className="space-y-3">
                            {Object.entries(preferences.email).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-gray-700 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <button 
                                        onClick={() => handleToggle('email', key)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

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
