
import { supabase } from '../supabaseClient';
import { Notification, NotificationType, User, NotificationPriority, Project, ProjectStatus, UserNotificationPreferences } from '../types';
import { sendEmailNotification } from './emailService';
import { sendSendPulseNotification } from './sendPulseService';

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
    pushEnabled: false
};

// Helper to get user data
const getUser = async (userId: string): Promise<User | null> => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    return data as User | null;
};

// Main function to create a notification
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> => {
    try {
        // 1. Add notification to Supabase
        await supabase.from('notifications').insert([{
            ...notificationData,
            isRead: false,
            timestamp: new Date().toISOString()
        }]);

        // 2. Fetch User Preferences
        const targetUser = await getUser(notificationData.userId);
        if (!targetUser) return;

        // Merge user preferences with defaults to avoid undefined errors
        const userPrefs = (targetUser.notificationPreferences || {}) as Partial<UserNotificationPreferences>;
        
        // Defensive coding: Ensure sub-objects exist
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
        
        // Safely check properties
        const checkEmailPref = (prop: keyof UserNotificationPreferences['email']) => {
            return emailPrefs && emailPrefs[prop] === true;
        };

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

        if (shouldSendEmail) {
            await sendEmailNotification({
                to: targetUser.email,
                subject: `[CostPilot] ${notificationData.title}`,
                body: `<p>Hi ${targetUser.name},</p><p>${notificationData.message}</p><p>Thank you,<br/>The CostPilot Team</p>`
            });
        }

        // 4. Web Push Notifications (SendPulse)
        let shouldSendPush = pushEnabled || false;
        
        // Safely check properties for push suppression
        const checkInAppPref = (prop: keyof UserNotificationPreferences['inApp']) => {
             return inAppPrefs && inAppPrefs[prop] === true;
        };

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

        if (shouldSendPush) {
            await sendSendPulseNotification({
                userId: notificationData.userId,
                title: notificationData.title,
                message: notificationData.message,
                url: notificationData.link || 'https://costpilot.app'
            });
        }

    } catch (error) {
        console.error("Error creating notification: ", error);
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
    const INACTIVITY_THRESHOLD_DAYS = 3; 

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

                if (project.teamLeader && project.teamLeader.id) {
                    // Logic: Overdue (diffDays < 0)
                    if (diffDays < 0) {
                        console.log(`Flagging overdue project: ${project.title}`);
                        await createNotification({
                            userId: project.teamLeader.id,
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
                            userId: project.teamLeader.id,
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
                            userId: project.teamLeader.id,
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

    // 2. Check Inactive Users
    try {
        const { data: users } = await supabase.from('users').select('*');
        if (users) {
            users.forEach(async (user: User) => {
                // Skip if no login record
                if (!user.lastLogin || !user.id) return;
                
                const lastLogin = new Date(user.lastLogin);
                const diffMs = now.getTime() - lastLogin.getTime();
                const diffDays = Math.floor(diffMs / dayInMs);

                if (diffDays >= INACTIVITY_THRESHOLD_DAYS) {
                     // Only notify inactive users if we haven't bugged them recently? 
                     // For simplicity, we just log this locally for now to avoid spam loop in this function 
                     // since checking 'notification history' is complex here.
                     // console.log(`User ${user.name} is inactive.`);
                }
            });
        }
    } catch (error) {
         console.error("Error checking inactivity:", error);
    }
    
    // Mark as run
    localStorage.setItem(STORAGE_KEY, now.getTime().toString());
    
    return { success: true, message: `Health checks completed. ${checksPerformed} alerts generated.` };
};
