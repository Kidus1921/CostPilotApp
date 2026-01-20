
import { supabase } from '../supabaseClient';
import { Notification, NotificationType, User, NotificationPriority, Project, ProjectStatus, UserNotificationPreferences } from '../types';
import { sendEmailNotification } from './emailService';

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

/**
 * Main function to create a notification with strict deduplication.
 * It checks if an identical notification was sent to this user TODAY.
 */
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Deduplication Logic: 
        // Check if a notification of same type for same user and same entity (link) exists for today
        const { data: existing, error: checkError } = await supabase
            .from('notifications')
            .select('id')
            .eq('userId', notificationData.userId)
            .eq('type', notificationData.type)
            .eq('link', notificationData.link || '')
            .gte('timestamp', today.toISOString())
            .limit(1);

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
            console.log(`[Notification Service] Duplicate event suppressed for user ${notificationData.userId} on entity ${notificationData.link}`);
            return;
        }

        // 1. Add notification to Supabase
        const { error: dbError } = await supabase.from('notifications').insert([{
            ...notificationData,
            isRead: false,
            timestamp: new Date().toISOString()
        }]);

        if (dbError) throw dbError;

        // 2. Handle Email Relay (Optional)
        let targetUser = await getUser(notificationData.userId);
        if (targetUser && targetUser.notificationPreferences) {
            const emailPrefs = (targetUser.notificationPreferences.email || {}) as any;
            let shouldSendEmail = false;

            if (notificationData.type === NotificationType.ApprovalRequest && emailPrefs.approvals) shouldSendEmail = true;
            if (notificationData.type === NotificationType.CostOverrun && emailPrefs.costOverruns) shouldSendEmail = true;
            if (notificationData.type === NotificationType.Deadline && emailPrefs.deadlines) shouldSendEmail = true;

            if (shouldSendEmail && targetUser.email) {
                await sendEmailNotification({
                    to: targetUser.email,
                    subject: `[EDFM Alert] ${notificationData.title}`,
                    body: `<p>${notificationData.message}</p>`
                });
            }
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

/**
 * Scans for health events like deadlines or cost overruns.
 * This is now triggered on login and manually via UI.
 */
export const runSystemHealthChecks = async () => {
    console.log("[Notification Service] Executing system health check...");
    const now = new Date();
    const dayInMs = 1000 * 60 * 60 * 24;
    
    try {
        const { data: projects } = await supabase.from('projects').select('*');
        if (!projects) return;

        for (const project of projects) {
            // Only check active projects
            if (project.status === ProjectStatus.Completed || project.status === ProjectStatus.Rejected) continue;
            
            const projectLink = `/projects/${project.id}`;

            // 1. Deadline Check
            if (project.endDate) {
                const endDate = new Date(project.endDate);
                const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / dayInMs);

                // Note: link and type must match exactly for the today-deduplication to work
                if (diffDays < 0) {
                    await createNotification({
                        userId: project.teamLeader.id,
                        title: 'Operational Alert: Project Overdue',
                        message: `Project "${project.title}" has exceeded its terminal date. Immediate review required.`,
                        type: NotificationType.Deadline,
                        priority: NotificationPriority.Critical,
                        link: projectLink
                    });
                } else if (diffDays <= 1) {
                    await createNotification({
                        userId: project.teamLeader.id,
                        title: 'Urgent: Deadline Tomorrow',
                        message: `Project "${project.title}" is scheduled for completion tomorrow.`,
                        type: NotificationType.Deadline,
                        priority: NotificationPriority.High,
                        link: projectLink
                    });
                }
            }

            // 2. Cost Overrun Check
            // Spent is calculated based on tasks (handled in processProjects logic, but check raw budget vs spent)
            const spent = project.spent || 0;
            const budget = project.budget || 0;
            
            if (spent > budget && budget > 0) {
                await createNotification({
                    userId: project.teamLeader.id,
                    title: 'Fiscal Alert: Budget Ceiling Exceeded',
                    message: `Actual consumption has exceeded the approved budget for project "${project.title}".`,
                    type: NotificationType.CostOverrun,
                    priority: NotificationPriority.High,
                    link: projectLink
                });
            }
        }
    } catch (error) {
        console.error("[Notification Service] Health check error:", error);
    }
};
