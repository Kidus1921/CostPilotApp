
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, UserNotificationPreferences, NotificationPriority, NotificationType } from '../../types';
import { createNotification } from '../../services/notificationService';
import { EnvelopeIcon, MegaphoneIcon } from '../IconComponents';

const defaultPreferences: UserNotificationPreferences = {
    inApp: { taskUpdates: true, approvals: true, costOverruns: true, deadlines: true, system: true },
    email: { taskUpdates: false, approvals: false, costOverruns: false, deadlines: false, system: false },
    priorityThreshold: NotificationPriority.Medium,
    projectSubscriptions: [],
    pushEnabled: false,
    emailEnabled: true
};

interface NotificationSettingsTabProps { currentUser: User; }

const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({ currentUser }) => {
    const currentUserId = currentUser.id; 
    const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

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
                    emailEnabled: dbPrefs.emailEnabled ?? true
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

    const handleSendTest = async () => {
        if (!currentUserId || !preferences) return;
        setTestStatus('sending');
        try {
            await createNotification({
                userId: currentUserId,
                title: 'Operational Test Alert',
                message: 'This is a test notification from your CostPilot settings. If email notifications are enabled, you should receive an email shortly.',
                type: NotificationType.System,
                priority: NotificationPriority.Low
            });
            setTestStatus('sent');
            setTimeout(() => setTestStatus('idle'), 3000);
        } catch (err) {
            setTestStatus('idle');
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse uppercase tracking-[0.3em] font-bold text-gray-500 dark:text-gray-400">Syncing Registry...</div>;
    if (!preferences) return null;

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div className="bg-base-100 dark:bg-[#111111] p-8 rounded-2xl shadow-sm border border-base-300 dark:border-white/10">
                <h3 className="text-xl font-bold text-base-content dark:text-white mb-8 uppercase tracking-widest">Alert Protocols</h3>
                
                <div className="bg-brand-primary/5 dark:bg-white/5 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-brand-primary/10 dark:border-white/5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-brand-primary/10 rounded-xl">
                            <EnvelopeIcon className="w-6 h-6 text-brand-primary" />
                        </div>
                        <div>
                             <h4 className="font-bold text-brand-primary uppercase tracking-widest text-sm">Email Notifications</h4>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Operational alerts dispatched to <span className="text-brand-primary font-bold">{currentUser.email}</span>.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleSendTest}
                            disabled={testStatus !== 'idle'}
                            className="text-[10px] font-bold text-gray-500 hover:text-brand-primary uppercase tracking-widest border border-gray-300 dark:border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
                        >
                            {testStatus === 'sending' ? 'Dispatching...' : testStatus === 'sent' ? 'Test Sent' : 'Send Test Alert'}
                        </button>
                        <button 
                            onClick={() => setPreferences({ ...preferences, emailEnabled: !preferences.emailEnabled })} 
                            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all ${preferences.emailEnabled ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.emailEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {['inApp', 'email'].map((section) => (
                        <div key={section}>
                            <h4 className="font-bold text-xs uppercase tracking-[0.2em] mb-6 text-gray-400 dark:text-gray-500 border-b border-base-200 dark:border-white/5 pb-2">
                                {section === 'inApp' ? 'In-App Telemetry' : 'Email Relays'}
                            </h4>
                            <div className="space-y-4">
                                {Object.entries(preferences[section as 'inApp' | 'email']).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        <button onClick={() => setPreferences({...preferences, [section]: {...(preferences[section as 'inApp' | 'email'] as any), [key]: !value}})} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${value ? 'bg-brand-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-10 border-t border-base-200 dark:border-white/5 mt-8">
                     <div className="flex items-center gap-2">
                        <MegaphoneIcon className="w-4 h-4 text-gray-400" />
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Settings synchronized across all terminals.</p>
                     </div>
                     <button onClick={handleSave} disabled={status === 'saving'} className="bg-brand-primary text-white font-bold py-3 px-10 rounded-xl shadow-lg hover:brightness-110 disabled:opacity-50 transition-all uppercase text-xs tracking-widest">
                        {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Protocol Saved' : 'Confirm Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettingsTab;
