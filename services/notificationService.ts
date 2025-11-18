import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Notification, NotificationType, User } from '../types';
import { sendEmailNotification } from './emailService';

// Helper to get user data - in a real app this would come from an auth context
const getUser = async (userId: string): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data() as User : null;
};

// Main function to create a notification
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> => {
    try {
        // 1. Add notification to Firestore
        await addDoc(collection(db, 'notifications'), {
            ...notificationData,
            isRead: false,
            timestamp: serverTimestamp()
        });

        // 2. Check user preferences for email notifications
        const targetUser = await getUser(notificationData.userId);
        if (!targetUser || !targetUser.notificationPreferences) return;

        const { email: emailPrefs } = targetUser.notificationPreferences;
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
