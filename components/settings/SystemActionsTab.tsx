
import React, { useState } from 'react';
import { Bell, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const SystemActionsTab: React.FC = () => {
    const [isTriggering, setIsTriggering] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const triggerDigest = async () => {
        setIsTriggering(true);
        setStatus(null);
        try {
            const response = await fetch('/api/cron/send-deadline-digest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setStatus({ 
                    type: 'success', 
                    message: `Successfully triggered! Processed ${data.processed || 0} users.` 
                });
            } else {
                throw new Error(data.error || 'Failed to trigger digest');
            }
        } catch (err: any) {
            setStatus({ 
                type: 'error', 
                message: err.message || 'An unexpected error occurred' 
            });
        } finally {
            setIsTriggering(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/10 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-brand-primary/10 rounded-xl">
                        <Bell className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold dark:text-white">Email Notifications</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manually trigger the daily deadline digest. This will scan all projects and send summary emails to assigned users for projects due within 2 days.
                        </p>
                        
                        <div className="mt-6">
                            <button
                                onClick={triggerDigest}
                                disabled={isTriggering}
                                className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
                            >
                                {isTriggering ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Daily Digest Now
                                    </>
                                )}
                            </button>
                        </div>

                        {status && (
                            <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
                                status.type === 'success' 
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30' 
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                            }`}>
                                {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                <span className="text-sm font-medium">{status.message}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/20">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">System Information</h4>
                <ul className="mt-3 space-y-2 text-sm text-blue-700 dark:text-blue-400">
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        Automated schedule: Every day at 8:00 AM
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        Target: Projects with status other than "Completed"
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        Threshold: Due date within 2 days from today
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default SystemActionsTab;
