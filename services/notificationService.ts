
import { supabase } from '../supabaseClient';
import { Notification, NotificationType, User, NotificationPriority, Project, ProjectStatus, UserNotificationPreferences } from '../types';
import { sendEmailNotification } from './emailService';
import { sendPushNotification } from './sendPulseService';

// Default preferences to fall back on
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
    pushEnabled: true // Default to true to encourage push
};

// Helper to get user data
const getUser = async (userId: string): Promise<User | null> => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    return data as User | null;
};

// Main function to create a notification
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> => {
    console.log(`[Notification Service] Creating notification for user: ${notificationData.userId}`, notificationData);
    
    try {
        // 1. Add notification to Supabase (In-App)
        const { error: dbError } = await supabase.from('notifications').insert([{
            ...notificationData,
            isRead: false,
            timestamp: new Date().toISOString()
        }]);

        if (dbError) throw dbError;
        console.log("[Notification Service] In-App notification saved to DB.");

        // 2. Fetch User Preferences
        let targetUser = await getUser(notificationData.userId);
        let userPrefs: Partial<UserNotificationPreferences> = {};

        if (targetUser) {
            userPrefs = (targetUser.notificationPreferences || {}) as Partial<UserNotificationPreferences>;
        } else {
             // Fallback if user fetch fails (e.g. RLS issues), use defaults so we still try to push
             console.warn(`[Notification Service] Could not fetch user ${notificationData.userId}. Using defaults.`);
             userPrefs = defaultPreferences;
        }

        // Merge user preferences with defaults to avoid undefined errors
        const safeUserEmailPrefs = userPrefs.email || {};
        const safeUserInAppPrefs = userPrefs.inApp || {};

        const emailPrefs = { 
            ...defaultPreferences.email, 
            ...safeUserEmailPrefs
        } as UserNotificationPreferences['email'];
        
        const inAppPrefs = { 
            ...defaultPreferences.inApp, 
            ...safeUserInAppPrefs
        } as UserNotificationPreferences['inApp'];

        const pushEnabled = userPrefs.pushEnabled !== undefined ? userPrefs.pushEnabled : defaultPreferences.pushEnabled;

        // 3. Email Notifications
        let shouldSendEmail = false;
        const checkEmailPref = (prop: keyof UserNotificationPreferences['email']) => emailPrefs && emailPrefs[prop] === true;

        switch (notificationData.type) {
            case NotificationType.ApprovalRequest:
            case NotificationType.ApprovalResult:
                if (checkEmailPref('approvals')) shouldSendEmail = true;
                break;
            case NotificationType.CostOverrun:
                if (checkEmailPref('costOverruns')) shouldSendEmail = true;
                break;
            case NotificationType.Deadline:
                if (checkEmailPref('deadlines')) shouldSendEmail = true;
                break;
            case NotificationType.System:
                if (checkEmailPref('system')) shouldSendEmail = true;
                break;
            case NotificationType.TaskUpdate:
                if (checkEmailPref('taskUpdates')) shouldSendEmail = true;
                break;
        }

        if (shouldSendEmail && targetUser?.email) {
            await sendEmailNotification({
                to: targetUser.email,
                subject: `[CostPilot] ${notificationData.title}`,
                body: `<p>Hi ${targetUser.name},</p><p>${notificationData.message}</p><p>Thank you,<br/>The CostPilot Team</p>`
            });
        }

        // 4. Web Push Notifications (SendPulse via Edge Function)
        let shouldSendPush = pushEnabled || false;
        
        const checkInAppPref = (prop: keyof UserNotificationPreferences['inApp']) => inAppPrefs && inAppPrefs[prop] === true;

        if (shouldSendPush) {
             switch (notificationData.type) {
                case NotificationType.ApprovalRequest:
                case NotificationType.ApprovalResult:
                    if (!checkInAppPref('approvals')) shouldSendPush = false;
                    break;
                case NotificationType.CostOverrun:
                    if (!checkInAppPref('costOverruns')) shouldSendPush = false;
                    break;
                case NotificationType.Deadline:
                    if (!checkInAppPref('deadlines')) shouldSendPush = false;
                    break;
                case NotificationType.System:
                    if (!checkInAppPref('system')) shouldSendPush = false;
                    break;
                case NotificationType.TaskUpdate:
                    if (!checkInAppPref('taskUpdates')) shouldSendPush = false;
                    break;
            }
        }

        console.log(`[Notification Service] Push allowed by user prefs: ${shouldSendPush}`);

        if (shouldSendPush) {
            await sendPushNotification(
                notificationData.userId,
                notificationData.title,
                notificationData.message
            );
        }

    } catch (error) {
        console.error("[Notification Service] Error creating notification: ", error);
    }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    await supabase.from('notifications').update({ isRead: true }).eq('id', notificationId);
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
    await supabase.from('notifications').delete().eq('id', notificationId);
};

export const runSystemHealthChecks = async (force: boolean = false) => {
    const STORAGE_KEY = 'costpilot_last_health_check_ts';
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    
    const lastRunStr = localStorage.getItem(STORAGE_KEY);
    const now = new Date();
    const lastRun = lastRunStr ? new Date(parseInt(lastRunStr)) : new Date(0);

    // If not forced, check if 12 hours have passed
    if (!force && (now.getTime() - lastRun.getTime() < TWELVE_HOURS_MS)) {
        console.log("System health checks ran recently (less than 12h ago). Skipping.");
        return { success: true, message: "Checks recently run." };
    }

    console.log("Running system health checks...");
    const dayInMs = 1000 * 60 * 60 * 24;
    
    let checksPerformed = 0;

    // 1. Check Deadlines (Overdue, Due Today, Due Soon)
    try {
        const { data: projects } = await supabase.from('projects').select('*');
        if (projects) {
            for (const project of projects) {
                if (!project.endDate) continue;
                if (project.status === ProjectStatus.Completed || project.status === ProjectStatus.Rejected) continue;
                
                const endDate = new Date(project.endDate);
                const diffTime = endDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / dayInMs); // Round up for days

                // Ensure we notify the team leader
                const targetUserId = project.teamLeader?.id || (typeof project.teamLeader === 'string' ? project.teamLeader : null);

                if (targetUserId) {
                    // Logic: Overdue (diffDays < 0)
                    if (diffDays < 0) {
                        console.log(`Flagging overdue project: ${project.title}`);
                        await createNotification({
                            userId: targetUserId,
                            title: '🚨 IMMEDIATE ATTENTION: Project Overdue',
                            message: `The project "${project.title}" was due on ${project.endDate}. Please review status immediately.`,
                            type: NotificationType.Deadline,
                            priority: NotificationPriority.Critical,
                            link: `/projects/${project.id}`
                        });
                        checksPerformed++;
                    }
                    // Logic: Due Today (diffDays === 0)
                    else if (diffDays === 0) {
                         console.log(`Flagging due today project: ${project.title}`);
                         await createNotification({
                            userId: targetUserId,
                            title: '⏰ Project Due Today',
                            message: `The project "${project.title}" is due today!`,
                            type: NotificationType.Deadline,
                            priority: NotificationPriority.High,
                            link: `/projects/${project.id}`
                        });
                        checksPerformed++;
                    }
                    // Logic: Due in 3 Days or less (but not today)
                    else if (diffDays <= 3 && diffDays > 0) {
                         console.log(`Flagging approaching deadline: ${project.title}`);
                         await createNotification({
                            userId: targetUserId,
                            title: '⏳ Upcoming Deadline',
                            message: `The project "${project.title}" is due in ${diffDays} day(s) (${project.endDate}).`,
                            type: NotificationType.Deadline,
                            priority: NotificationPriority.High,
                            link: `/projects/${project.id}`
                        });
                        checksPerformed++;
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error checking deadlines:", error);
    }
    
    // Mark as run
    localStorage.setItem(STORAGE_KEY, now.getTime().toString());
    
    return { success: true, message: `Health checks completed. ${checksPerformed} alerts generated.` };
};
