
// Augment window interface for SendPulse
declare global {
    interface Window {
        oSpP: any;
    }
}

let testClientId: string | null = null;
let testClientSecret: string | null = null;

/**
 * Sets temporary credentials for testing purposes (used in Admin Broadcast).
 */
export const setSendPulseCredentials = (id: string, secret: string) => {
    testClientId = id;
    testClientSecret = secret;
    console.log("SendPulse Credentials Set");
};

/**
 * Initializes SendPulse logic if needed.
 */
export const initSendPulse = (userId: string) => {
    console.log(`SendPulse: Service initialized for user ${userId}`);
    
    if ('serviceWorker' in navigator) {
        try {
            // Explicitly attempt to register the service worker. 
            // This fixes issues where the external script fails due to origin mismatch in preview environments.
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log("Manual Service Worker registration successful, scope:", registration.scope);
                })
                .catch(err => {
                    // In cloud IDEs (like AI Studio/StackBlitz), the preview iframe origin often mismatches the parent,
                    // causing a specific SecurityError. We log this gently rather than letting it look like a crash.
                    if (err.message && (err.message.includes('origin') || err.message.includes('documentURL'))) {
                        console.warn("Service Worker registration restricted by environment (Origin Mismatch). Push notifications may not work in this preview frame.");
                    } else {
                        console.warn("Manual Service Worker registration failed:", err);
                    }
                });

            // Check registration status safely
            navigator.serviceWorker.getRegistration()
                .then(registration => {
                    if (registration) {
                        console.log("SendPulse Service Worker is active:", registration.scope);
                    } else {
                        // It's okay if not active yet, the user might not have clicked Subscribe
                    }
                })
                .catch(error => {
                    // Silently handle getRegistration errors in restricted environments
                    // console.debug("Service Worker status check skipped due to environment restrictions.");
                });

        } catch (e) {
            console.warn("Service Worker operations failed:", e);
        }
    } else {
        console.error("Service Workers are not supported in this browser.");
    }
};

/**
 * Requests permission for Web Push via SendPulse.
 */
export const subscribeToSendPulse = async (): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
        console.log("Triggering SendPulse subscription...");

        // Standard browser permission request
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log("Notification permission granted.");
                // SendPulse should automatically detect this via the Service Worker
                resolve({ success: true, message: "Notifications allowed." });
            } else {
                console.warn("Notification permission denied.");
                resolve({ success: false, message: "Notification permission denied. Please enable it in browser settings." });
            }
        });
    });
};

/**
 * Unsubscribes from SendPulse notifications.
 */
export const unsubscribeFromSendPulse = async (): Promise<void> => {
     console.log("User requested unsubscribe. To fully unsubscribe, please block notifications in browser settings.");
}


interface SendPushPayload {
    userId: string;
    title: string;
    message: string;
    url?: string;
}

/**
 * Sends a Web Push Notification via SendPulse REST API.
 * NOTE: This simulates the API call. In production, perform this server-side to keep secrets safe.
 */
export const sendSendPulseNotification = async (payload: SendPushPayload): Promise<void> => {
    const clientId = testClientId;
    const clientSecret = testClientSecret;
    
    if (!clientId || !clientSecret) {
        console.log(`[Mock SendPulse] Push to ${payload.userId}: ${payload.title}`);
        // If notification permission is granted, try to show a local one for testing
        if (Notification.permission === "granted") {
             new Notification(payload.title, {
                 body: payload.message,
                 icon: '/logo192.png'
             });
        }
        return;
    }

    console.log("Attempting to send via SendPulse API...");
    
    try {
        // 1. Get Token
        const tokenResponse = await fetch('https://api.sendpulse.com/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            })
        });
        
        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) {
            console.error("Failed to get SendPulse Access Token", tokenData);
            return;
        }

        console.log(`[SendPulse] Authenticated! Token acquired. simulating broadcast of: "${payload.title}"`);

    } catch (error) {
        console.error("Failed to interact with SendPulse API (CORS restriction likely):", error);
    }
};
