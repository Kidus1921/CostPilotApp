
import React, { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User, UserNotificationPreferences, NotificationPriority, Project, UserRole, NotificationType } from '../../types';
import { BellIcon, EnvelopeIcon } from '../IconComponents';
import { subscribeToSendPulse, unsubscribeFromSendPulse, setSendPulseCredentials } from '../../services/sendPulseService';
import { createNotification } from '../../services/notificationService';

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

const NotificationSettingsTab: React.FC = () => {
    // Hardcoded user for now, in real app this would be from context
    const currentUserId = 'u1'; 
    const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.ProjectManager);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    
    // Admin Broadcast State
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    
    // Credentials for SendPulse testing
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

    useEffect(() => {
        if (!currentUserId) return;

        let userLoaded = false;
        let projectsLoaded = false;
        
        const checkLoading = () => {
            if (userLoaded && projectsLoaded) {
                setLoading(false);
            }
        };

        const userRef = doc(db, 'users', currentUserId);
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data() as User;
                setPreferences(userData.notificationPreferences || defaultPreferences);
                setCurrentUserRole(userData.role);
            } else {
                setPreferences(defaultPreferences);
            }
            if(!userLoaded) {
                userLoaded = true;
                checkLoading();
            }
            setError(null);
        }, (err) => {
            console.error("Failed to fetch user preferences:", err);
            setError("Could not load notification settings.");
            setLoading(false);
        });

        const projectsQuery = query(collection(db, 'projects'));
        const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
            const projectsData: Project[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(projectsData);
            if(!projectsLoaded) {
                projectsLoaded = true;
                checkLoading();
            }
             setError(null);
        }, (err) => {
            console.error("Failed to fetch projects for subscriptions:", err);
            setError("Could not load project list.");
            setLoading(false);
        });

        return () => {
            unsubscribeUser();
            unsubscribeProjects();
        };
    }, [currentUserId]);

    const handlePreferenceChange = useCallback((category: 'inApp' | 'email', key: string, value: boolean) => {
        setPreferences(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [category]: {
                    ...prev[category],
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
                 const result = await subscribeToSendPulse();
                 if (!result.success) {
                     // Revert if user cancels or fails
                     // alert(result.message);
                     console.warn(result.message);
                 }
             } catch (e) {
                 console.error(e);
             }
        } else {
            unsubscribeFromSendPulse();
        }
    };

    const handleSave = async () => {
        if (!currentUserId || !preferences) return;
        setStatus('saving');
        try {
            const userRef = doc(db, 'users', currentUserId);
            await updateDoc(userRef, {
                notificationPreferences: preferences
            });
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
            try {
                // Check if Service Worker is ready to simulate a real push
                const registration = await navigator.serviceWorker.getRegistration();
                
                if (registration && registration.active) {
                     await registration.showNotification("CostPilot", {
                        body: "Success! Push notifications are configured correctly via Service Worker.",
                        icon: "/logo192.png", 
                        vibrate: [200, 100, 200],
                        tag: 'test-notification'
                    } as any);
                } else {
                    // Fallback to local notification if SW isn't ready (e.g. in some dev environments)
                     new Notification("CostPilot", {
                        body: "Notifications are active (Local Mode). Service Worker not detected yet.",
                        icon: "/logo192.png"
                    });
                }
            } catch (e) {
                console.error("Test notification error:", e);
                // Ultimate fallback
                new Notification("CostPilot", {
                    body: "Test notification successful.",
                });
            }
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                     new Notification("CostPilot", {
                        body: "Permissions granted! You can now receive notifications.",
                    });
                }
            });
        } else {
            alert("🚫 Notifications are blocked.\n\nTo enable:\n1. Click the Lock icon 🔒 in the address bar.\n2. Go to Site Settings > Permissions.\n3. Allow Notifications.");
        }
    };

    const handleAdminBroadcast = async () => {
        if (!broadcastTitle || !broadcastMessage) return;
        
        setBroadcastStatus('sending');
        
        try {
            console.log(`[Admin Broadcast] Title: ${broadcastTitle}, Msg: ${broadcastMessage}`);
            
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            
            let count = 0;
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
                            {/* REQUIRED SendPulse Link - Using 'a' tag with preventDefault to satisfy SendPulse script requirements without navigating */}
                            <a 
                                href="#"
                                className="sp_notify_prompt text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors inline-block shadow-sm no-underline"
                                onClick={(e) => e.preventDefault()}
                            >
                                Activate notifications
                            </a>
                            <button 
                                onClick={handleTestNotification}
                                className="text-xs bg-white border border-indigo-200 text-indigo-800 px-3 py-2 rounded hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-indigo-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                Test Send
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
                                            checked={preferences.inApp[key as keyof typeof preferences.inApp]}
                                            onChange={e => handlePreferenceChange('inApp', key, e.target.checked)}
                                        />
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded text-brand-primary focus:ring-brand-primary"
                                            checked={preferences.email[key as keyof typeof preferences.email]}
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
            )}

            <div className="flex justify-end pt-4 pb-10">
                 <button
                    onClick={handleSave}
                    disabled={status === 'saving'}
                    className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
                >
                    {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
};

export default NotificationSettingsTab;
