
/**
 * This service has been deprecated and Brevo concepts removed.
 * File retained to prevent import errors if any legacy references exist,
 * but functionality is disabled.
 */

export const subscribeToBrevoPush = async (userId: string): Promise<{ success: boolean; message: string }> => {
    console.warn("Brevo push service is removed.");
    return { success: false, message: "Service removed" };
};

export const sendBrevoPushNotification = async (payload: any): Promise<void> => {
    console.warn("Brevo push service is removed.");
};

export const getBrevoSubscriberId = async (userId: string): Promise<string | null> => {
    return null;
};
