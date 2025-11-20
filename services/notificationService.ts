
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Notification, NotificationType, User } from '../types';
import { sendEmailNotification } from './emailService';
import { sendSendPulseNotification } from './sendPulseService';

// Helper to get user data
const getUser = async (userId: string): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data() as User : null;
};

// Main function to create a notification
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> => {
    try {
        // 1. Add notification to Firestore (In-App History)
        await addDoc(collection(db, 'notifications'), {
            ...notificationData,
            isRead: false,
            timestamp: serverTimestamp()
        });

        // 2. Fetch User Preferences
        const targetUser = await getUser(notificationData.userId);
        if (!targetUser || !targetUser.notificationPreferences) return;

        const { email: emailPrefs, inApp: inAppPrefs, pushEnabled } = targetUser.notificationPreferences;
        
        // Determine priority logic (simple threshold check)
        // (In a real app, map priority enums to numbers for comparison)
        
        // 3. Email Notifications
        let shouldSendEmail = false;
        switch (notificationData.type) {
            case NotificationType.ApprovalRequest:
            case NotificationType.ApprovalResult:
                if (emailPrefs.approvals) shouldSendEmail = true;
                break;
            case NotificationType.CostOverrun:
                if (emailPrefs.costOverruns) shouldSendEmail = true;
                break;
            case NotificationType.Deadline:
                if (emailPrefs.deadlines) shouldSendEmail = true;
                break;
            case NotificationType.System:
                if (emailPrefs.system) shouldSendEmail = true;
                break;
            case NotificationType.TaskUpdate:
                if (emailPrefs.taskUpdates) shouldSendEmail = true;
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
        // Check global push toggle and specific category in inApp
        let shouldSendPush = pushEnabled || false;
        
        // Refine push logic based on category if globally enabled
        if (shouldSendPush) {
             switch (notificationData.type) {
                case NotificationType.ApprovalRequest:
                case NotificationType.ApprovalResult:
                    if (!inAppPrefs.approvals) shouldSendPush = false;
                    break;
                case NotificationType.CostOverrun:
                    if (!inAppPrefs.costOverruns) shouldSendPush = false;
                    break;
                case NotificationType.Deadline:
                    if (!inAppPrefs.deadlines) shouldSendPush = false;
                    break;
                case NotificationType.System:
                    if (!inAppPrefs.system) shouldSendPush = false;
                    break;
                case NotificationType.TaskUpdate:
                    if (!inAppPrefs.taskUpdates) shouldSendPush = false;
                    break;
            }
        }

        if (shouldSendPush) {
            // Send to SendPulse API (Simulated or via credentials)
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
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { isRead: true });
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
    await deleteDoc(doc(db, 'notifications', notificationId));
};
