
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
    pushEnabled: false,
    emailEnabled: true
};

// Helper to get user data
const getUser = async (userId: string): Promise<User | null> => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    return data as User | null;
};

/**
 * Generates a professional HTML email template for notifications.
 */
const generateNoreplyTemplate = (userName: string, title: string, message: string, link?: string) => {
    const actionUrl = link ? `${window.location.origin}${link}` : window.location.origin;
    
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #65081b; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">CostPilot</h1>
        </div>
        <div style="padding: 32px; color: #1a1a1a;">
            <h2 style="font-size: 18px; color: #65081b;">Hello ${userName},</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                You have received a new operational notification regarding your project portfolio:
            </p>
            <div style="background-color: #f9fafb; border-left: 4px solid #d3a200; padding: 16px; margin: 24px 0;">
                <strong style="display: block; font-size: 14px; text-transform: uppercase; color: #9ca3af; margin-bottom: 4px;">${title}</strong>
                <p style="margin: 0; font-size: 16px; font-weight: 500;">${message}</p>
            </div>
            <div style="text-align: center; margin-top: 32px;">
                <a href="${actionUrl}" style="background-color: #65081b; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">View in Dashboard</a>
            </div>
        </div>
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">This is an automated system message from CostPilot. Please do not reply to this email.</p>
            <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} CostPilot Operational Registry</p>
        </div>
    </div>
    `;
};

/**
 * Main function to create a notification with strict deduplication and email relay.
 */
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> => {
    console.log(`[Notification Engine] Initializing creation for user: ${notificationData.userId} | Type: ${notificationData.type}`);
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Deduplication Logic
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
            console.log(`[Notification Engine] Skipping: Identical notification dispatched within the current 24h window.`);
            return;
        }

        // 1. Add notification to Supabase
        const { error: dbError } = await supabase.from('notifications').insert([{
            ...notificationData,
            isRead: false,
            timestamp: new Date().toISOString()
        }]);

        if (dbError) throw dbError;

        // 2. Handle Email Relay
        let targetUser = await getUser(notificationData.userId);
        
        if (!targetUser || !targetUser.email) {
            console.log(`[Notification Engine] Abort Relay: Target agent profile or email not found.`);
            return;
        }

        const prefs = targetUser.notificationPreferences || defaultPreferences;
        
        if (prefs.emailEnabled) {
            const emailPrefs = (prefs.email || {}) as any;
            let shouldSendEmail = false;

            if (notificationData.type === NotificationType.ApprovalRequest && emailPrefs.approvals) shouldSendEmail = true;
            if (notificationData.type === NotificationType.ApprovalResult && emailPrefs.approvals) shouldSendEmail = true;
            if (notificationData.type === NotificationType.CostOverrun && emailPrefs.costOverruns) shouldSendEmail = true;
            if (notificationData.type === NotificationType.Deadline && emailPrefs.deadlines) shouldSendEmail = true;
            if (notificationData.type === NotificationType.TaskUpdate && emailPrefs.taskUpdates) shouldSendEmail = true;
            if (notificationData.type === NotificationType.System && emailPrefs.system) shouldSendEmail = true;

            if (shouldSendEmail) {
                const htmlBody = generateNoreplyTemplate(targetUser.name, notificationData.title, notificationData.message, notificationData.link);
                
                await sendEmailNotification({
                    to: targetUser.email,
                    subject: `[CostPilot] ${notificationData.title}`,
                    body: htmlBody
                });
            }
        }

    } catch (error) {
        console.error("[Notification Engine] Error: ", error);
    }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    await supabase.from('notifications').update({ isRead: true }).eq('id', notificationId);
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
    await supabase.from('notifications').delete().eq('id', notificationId);
};

export const runSystemHealthChecks = async () => {
    const now = new Date();
    const dayInMs = 1000 * 60 * 60 * 24;
    
    try {
        const { data: projects } = await supabase.from('projects').select('*');
        if (!projects) return;

        for (const project of projects) {
            if (project.status === ProjectStatus.Completed || project.status === ProjectStatus.Rejected) continue;
            
            const projectLink = `/projects/${project.id}`;

            if (project.endDate) {
                const endDate = new Date(project.endDate);
                const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / dayInMs);

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
        console.error("[System Health] Diagnostic failure:", error);
    }
};
