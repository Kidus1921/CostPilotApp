
import { supabase } from '../supabaseClient';

// Augment window interface for SendPulse SDK
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
 * Initializes SendPulse logic.
 */
export const initSendPulse = (userId: string) => {
    // Ensuring the SDK object exists
    if (!window.oSpP) {
        window.oSpP = [];
    }
};

/**
 * Checks the status of the push subscription stack.
 * Used for Diagnostics.
 */
export const getPushSubscriptionStatus = async (userId: string) => {
    const status = {
        permission: Notification.permission,
        sdkLoaded: !!window.oSpP,
        serviceWorker: false,
        dbLinked: false,
        subscriberId: null as string | null
    };

    // Check SW
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            status.serviceWorker = !!registration;
        } catch (e: any) {
            // Silence "Origin mismatch" errors common in preview environments
            if (!e.message?.includes('Origin mismatch')) {
                console.debug("Service Worker check skipped:", e);
            }
        }
    }

    // Check DB
    if (userId) {
        try {
            const { data, error } = await supabase
                .from('push_subscribers')
                .select('subscriber_id')
                .eq('user_id', userId)
                .maybeSingle();

            if (data) {
                status.dbLinked = true;
                status.subscriberId = data.subscriber_id;
            } else if (error) {
                console.debug("Push DB check info (likely table missing):", error.message);
            }
        } catch (err) {
            console.warn("Push subscriber check failed:", err);
        }
    }

    return status;
};

// Helper to wait for SDK to load
const waitForSdk = async (timeout = 5000): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (window.oSpP && typeof window.oSpP.push === 'function') return true;
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
};

/**
 * Requests permission for Web Push via SendPulse SDK AND links the ID to the Supabase User.
 * If this is a new subscription (not found in DB), it sends a Welcome Push.
 */
export const subscribeToSendPulse = async (): Promise<{ success: boolean; message: string }> => {
    // 1. Wait for SDK to load (async script)
    const sdkReady = await waitForSdk();
    if (!sdkReady) {
        return { success: false, message: "Push service not ready. Please refresh and try again." };
    }

    return new Promise((resolve) => {
        console.log("Triggering SendPulse subscription...");

        // 2. Use SendPulse SDK to handle the subscription cycle
        window.oSpP.push(['init']); 
        
        let attempts = 0;
        const maxAttempts = 20;

        const checkSubscription = setInterval(async () => {
            attempts++;
            
            if (Notification.permission === 'denied') {
                clearInterval(checkSubscription);
                resolve({ success: false, message: "Notifications are blocked in browser settings." });
                return;
            }

            // 'getID' callback returns the subscriber ID if subscribed
            window.oSpP.push(['getID', async function(subscriberId: string) {
                if (subscriberId) {
                    clearInterval(checkSubscription);
                    console.log("SendPulse ID received:", subscriberId);

                    // 3. Link to Supabase User
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    if (user) {
                        // Check if record already exists to decide on Welcome Message
                        const { data: existingRecord } = await supabase
                            .from('push_subscribers')
                            .select('user_id')
                            .eq('user_id', user.id)
                            .maybeSingle();

                        // Attempt to save to DB
                        const { error } = await supabase.from('push_subscribers').upsert({
                            user_id: user.id,
                            subscriber_id: subscriberId,
                            platform: 'sendpulse',
                            created_at: new Date().toISOString()
                        }, { onConflict: 'user_id' });

                        if (error) {
                            console.warn("Database linking failed:", error.message);
                            if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
                                resolve({ success: true, message: "Push active on device, but DB table missing. Please run setup SQL." });
                            } else {
                                resolve({ success: true, message: "Push active (Device only - DB Sync Failed)." });
                            }
                        } else {
                            console.log("Device successfully linked to User ID:", user.id);
                            
                            // 4. Send Welcome Message if this was a new DB entry
                            if (!existingRecord) {
                                console.log("New subscriber detected. Sending welcome message...");
                                // Retrieve user profile name for personalization
                                let userName = "User";
                                const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single();
                                if (profile && profile.name) userName = profile.name;

                                await sendSendPulseNotification({
                                    userId: user.id,
                                    title: `Welcome, ${userName}!`,
                                    message: "You have successfully subscribed to CostPilot notifications.",
                                    url: window.location.origin
                                });
                            }

                            resolve({ success: true, message: "Notifications active and linked." });
                        }
                    } else {
                        resolve({ success: true, message: "Notifications active (Guest mode)." });
                    }
                } else if (attempts >= maxAttempts) {
                    // If no ID yet, and permission is default, SDK might not have prompted automatically.
                    clearInterval(checkSubscription);
                    resolve({ success: false, message: "Could not retrieve Subscriber ID. Please allow notifications if prompted." });
                }
            }]);
        }, 500);
    });
};

/**
 * Automatically syncs subscription if permission is already granted (e.g. on login).
 * Does NOT prompt the user if permission is 'default' (avoids popup blocking issues).
 */
export const syncPushSubscription = async () => {
    if (Notification.permission === 'granted') {
        console.log("[SendPulse] Permission granted. Syncing subscription in background...");
        await subscribeToSendPulse();
    } else {
        console.log("[SendPulse] Permission not granted yet. Waiting for user action.");
    }
};

export const unsubscribeFromSendPulse = async (): Promise<void> => {
     console.log("User requested unsubscribe.");
     const { data: { user } } = await supabase.auth.getUser();
     if (user) {
         try {
             await supabase.from('push_subscribers').delete().eq('user_id', user.id);
         } catch (e) {
             console.warn("Unsubscribe DB update failed:", e);
         }
     }
}

interface SendPushPayload {
    userId: string;
    title: string;
    message: string;
    url?: string;
}

/**
 * Sends a Web Push Notification via SendPulse REST API.
 */
export const sendSendPulseNotification = async (payload: SendPushPayload): Promise<void> => {
    const clientId = testClientId;
    const clientSecret = testClientSecret;
    
    // 1. Look up the specific Subscriber ID for this User ID
    let subscriberId: string | undefined;

    try {
        const { data, error } = await supabase
            .from('push_subscribers')
            .select('subscriber_id')
            .eq('user_id', payload.userId)
            .maybeSingle();
        
        if (error) {
            console.debug("Could not fetch push subscriber from DB:", error.message);
        } else if (data) {
            subscriberId = data.subscriber_id;
        }
    } catch (e) {
        console.debug("Error fetching push subscriber:", e);
    }

    // Fallback: If no DB record or table missing, try local browser notification if user matches
    if (!subscriberId) {
        // Fallback: If testing locally with self, show native notification (works if browser is open)
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === payload.userId && Notification.permission === "granted") {
             console.log("[SendPulse] Showing fallback browser notification.");
             try {
                new Notification(payload.title, { 
                    body: payload.message
                });
             } catch(e) { console.error(e) }
        }
        return;
    }

    const targetSubscriberId = subscriberId;

    if (!clientId || !clientSecret) {
        console.log(`[SendPulse Simulation] Would send push to ID ${targetSubscriberId}: ${payload.title}`);
        return;
    }

    // Note: Calling this from client exposes secrets. Should be server-side.
    try {
        // 2. Get Token
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

        // 3. Send to Specific Website Subscriber
        const pushResponse = await fetch('https://api.sendpulse.com/push/tasks', {
             method: 'POST',
             headers: {
                 'Authorization': `Bearer ${tokenData.access_token}`,
                 'Content-Type': 'application/json'
             },
             body: JSON.stringify({
                 title: payload.title,
                 body: payload.message,
                 ttl: 86400, // Live for 24 hours
                 link: payload.url,
                 filter: {
                     variable_name: 'id', 
                     operator: 'or',
                     value: [targetSubscriberId]
                 }
             })
        });
        
        const pushResult = await pushResponse.json();
        console.log(`[SendPulse] API Response:`, pushResult);

    } catch (error) {
        console.error("Failed to interact with SendPulse API:", error);
    }
};
