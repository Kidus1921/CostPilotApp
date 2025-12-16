
/**
 * SendPulse Service - DISCONNECTED
 * This file previously handled push notifications via SendPulse.
 * All functions have been stubbed to prevent errors in existing imports.
 */

declare global {
  interface Window {
    oSpP: any;
  }
}

export const initSendPulse = (userId: string) => {
  // No-op
};

export const subscribeToSendPulse = async (
  userId?: string
): Promise<{ success: boolean; message: string }> => {
  return { success: false, message: "Push notifications are currently disabled." };
};

export const syncPushSubscription = async (userId?: string) => {
  // No-op
};

export const unsubscribeFromSendPulse = async () => {
  // No-op
};

export const getPushSubscriptionStatus = async (userId: string) => {
    return {
        permission: 'default',
        sdkLoaded: false,
        serviceWorker: false,
        dbLinked: false,
        subscriberId: null
    };
};

export const sendPushNotification = async (
  userId: string,
  title: string,
  message: string
) => {
  // No-op
  console.log("Push notification suppressed (Service disconnected):", title);
};

// Backwards compatibility alias
export const sendSendPulseNotification = async (payload: {userId: string, title: string, message: string}) => {
    // No-op
};
