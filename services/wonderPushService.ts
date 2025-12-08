
/**
 * This service has been removed.
 * File retained to prevent import errors if any legacy references exist,
 * but functionality is disabled.
 */

export const setTestAccessToken = (token: string) => {
    console.warn("WonderPush service is removed.");
};

export const initWonderPush = (userId: string) => {
    console.warn("WonderPush service is removed.");
};

export const subscribeToWonderPush = async (): Promise<{ success: boolean; message: string }> => {
    return { success: false, message: "Service removed" };
};

export const isWonderPushSubscribed = async (): Promise<boolean> => {
     return false;
}

export const unsubscribeFromWonderPush = async (): Promise<void> => {}

export const sendWonderPushNotification = async (payload: any): Promise<void> => {
    console.warn("WonderPush service is removed.");
};
