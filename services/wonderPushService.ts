
// Augment window interface for WonderPush
declare global {
    interface Window {
        WonderPush: any;
    }
}

let testAccessToken: string | null = null;

/**
 * Sets a temporary access token for testing purposes.
 */
export const setTestAccessToken = (token: string) => {
    testAccessToken = token;
    console.log("WonderPush Test Token Set");
};

/**
 * Initializes WonderPush with the current User ID.
 * This links the device to the user for targeted notifications.
 */
export const initWonderPush = (userId: string) => {
    if (window.WonderPush) {
        window.WonderPush.push(['setUserId', userId]);
        console.log(`WonderPush: Linked device to user ${userId}`);
    } else {
        // Retry once if script is slightly delayed
        setTimeout(() => {
             if (window.WonderPush) {
                window.WonderPush.push(['setUserId', userId]);
             }
        }, 2000);
    }
};

/**
 * Requests permission for Web Push.
 */
export const subscribeToWonderPush = async (): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
        if (!window.WonderPush) {
            resolve({ success: false, message: "WonderPush SDK not loaded. Please check your internet connection or ad-blocker." });
            return;
        }

        // 1. Set a timeout to avoid hanging indefinitely if the user ignores the prompt
        const timeoutId = setTimeout(() => {
            resolve({ success: false, message: "Subscription request timed out. Did you close the permission prompt?" });
        }, 15000);

        window.WonderPush.push(['subscribe', (subscription: any, error: any) => {
            // 2. Clear timeout on response
            clearTimeout(timeoutId);
            
            if (error) {
                console.error("WonderPush subscription error:", error);
                const msg = typeof error === 'string' ? error : (error.message || "Unknown error");
                resolve({ success: false, message: "Subscription failed: " + msg });
            } else {
                console.log("WonderPush subscribed:", subscription);
                resolve({ success: true, message: "Successfully subscribed to Push Notifications." });
            }
        }]);
    });
};

/**
 * Checks if the user is already subscribed.
 */
export const isWonderPushSubscribed = async (): Promise<boolean> => {
     return new Promise((resolve) => {
        if (!window.WonderPush) {
            resolve(false);
            return;
        }
        window.WonderPush.push(['isSubscribed', (isSubscribed: boolean) => {
            resolve(isSubscribed);
        }]);
     });
}

/**
 * Disables push notifications (opt-out).
 */
export const unsubscribeFromWonderPush = async (): Promise<void> => {
     if (window.WonderPush) {
        window.WonderPush.push(['unsubscribe']);
     }
}


interface SendPushPayload {
    userId: string;
    title: string;
    message: string;
    url?: string;
}

/**
 * Sends a Web Push Notification via WonderPush Management API.
 * NOTE: In a production environment, this should be done server-side to protect the Access Token.
 */
export const sendWonderPushNotification = async (payload: SendPushPayload): Promise<void> => {
    // Use test token if set, otherwise fall back to env var
    const accessToken = testAccessToken || process.env.WONDERPUSH_ACCESS_TOKEN;
    
    if (!accessToken) {
        console.warn("WonderPush Access Token missing. Push notification not sent to API.");
        console.log("To test sending, please enter an Access Token in Settings > Notifications > Admin Broadcast.");
        console.log("Mock Push Payload:", payload);
        return;
    }

    // WonderPush Management API endpoint
    const url = `https://api.wonderpush.com/v1/deliveries?accessToken=${accessToken}`;

    const body = {
        notification: {
            alert: {
                title: payload.title,
                text: payload.message,
            },
            targetUrl: payload.url
        },
        targetUserIds: [payload.userId],
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error("WonderPush API Error:", err);
        } else {
            console.log("WonderPush notification sent successfully.");
        }
    } catch (error) {
        console.error("Failed to send WonderPush notification:", error);
    }
};
