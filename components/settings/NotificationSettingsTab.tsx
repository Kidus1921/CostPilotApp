
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, UserNotificationPreferences, NotificationPriority } from '../../types';
import { subscribeToSendPulse } from '../../services/sendPulseService';

const defaultPreferences: UserNotificationPreferences = {
    inApp: { taskUpdates: true, approvals: true, costOverruns: true, deadlines: true, system: true },
    email: { taskUpdates: false, approvals: false, costOverruns: false, deadlines: false, system: false },
    priorityThreshold: NotificationPriority.Medium,
    projectSubscriptions: [],
    pushEnabled: false
};

interface NotificationSettingsTabProps { currentUser: User; }

const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({ currentUser }) => {
    const currentUserId = currentUser.id; 
    const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        if (!currentUserId) return;
        const fetchUser = async () => {
            const { data } = await supabase.from('users').select('*').eq('id', currentUserId).single();
            if (data) {
                const dbPrefs = (data.notificationPreferences || {}) as Partial<UserNotificationPreferences>;
                setPreferences({
                    ...defaultPreferences,
                    ...dbPrefs,
                    inApp: { ...defaultPreferences.inApp, ...(dbPrefs.inApp || {}) },
                    email: { ...defaultPreferences.email, ...(dbPrefs.email || {}) },
                    pushEnabled: dbPrefs.pushEnabled ?? false
                });
            } else setPreferences(defaultPreferences);
            setLoading(false);
        };
        fetchUser();
    }, [currentUserId]);

    const handleSave = async () => {
        if (!currentUserId || !preferences) return;
        setStatus('saving');
        try {
            await supabase.from('users').update({ notificationPreferences: preferences }).eq('id', currentUserId);
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (err) { setStatus('idle'); }
    };

    const handlePushToggle = async () => {
        if (!preferences) return;
        if (!preferences.pushEnabled) {
            setStatus('saving');
            const result = await subscribeToSendPulse(currentUserId);
            if (result.success) setPreferences({ ...preferences, pushEnabled: true });
            setStatus('idle');
        } else setPreferences({ ...preferences, pushEnabled: false });
    };

    if (loading) return <div className="p-20 text-center animate-pulse uppercase tracking-[0.3em] font-bold text-gray-500 dark:text-gray-400">Syncing Registry...</div>;
    if (!preferences) return null;

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div className="bg-base-100 dark:bg-[#111111] p-8 rounded-2xl shadow-sm border border-base-300 dark:border-white/10">
                <h3 className="text-xl font-bold text-base-content dark:text-white mb-8 uppercase tracking-widest">Alert Protocols</h3>
                
                <div className="bg-brand-primary/5 dark:bg-white/5 rounded-2xl p-6 mb-8 flex items-center justify-between border border-brand-primary/10 dark:border-white/5">
                    <div>
                         <h4 className="font-bold text-brand-primary uppercase tracking-widest text-sm">Push Notifications</h4>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Real-time system telemetry delivered to your device.</p>
                    </div>
                     <button onClick={handlePushToggle} className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all ${preferences.pushEnabled ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-700'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.pushEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {['inApp', 'email'].map((section) => (
                        <div key={section}>
                            <h4 className="font-bold text-xs uppercase tracking-[0.2em] mb-6 text-gray-400 dark:text-gray-500 border-b border-base-200 dark:border-white/5 pb-2">{section === 'inApp' ? 'In-App Telemetry' : 'Email Relays'}</h4>
                            <div className="space-y-4">
                                {Object.entries(preferences[section as 'inApp' | 'email']).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        <button onClick={() => setPreferences({...preferences, [section]: {...preferences[section as 'inApp' | 'email'], [key]: !value}})} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${value ? 'bg-brand-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-10 border-t border-base-200 dark:border-white/5 mt-8">
                     <button onClick={handleSave} disabled={status === 'saving'} className="bg-brand-primary text-white font-bold py-3 px-10 rounded-xl shadow-lg hover:brightness-110 disabled:opacity-50 transition-all uppercase text-xs tracking-widest">
                        {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Protocol Saved' : 'Confirm Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettingsTab;
