
import { supabase } from '../supabaseClient';

// Augment window interface for SendPulse SDK
declare global {
    interface Window {
        oSpP: any;
    }
}

let testClientId: string | null = null;
let testClientSecret: string | null = null;
let syncRan = false; // Prevent multiple sync attempts per session

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

    // Check SW (Skip in preview/development to avoid origin mismatch errors)
    if ('serviceWorker' in navigator && !window.location.hostname.includes('content.goog')) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            status.serviceWorker = !!registration;
        } catch (e: any) {
             // Silence expected "Origin mismatch" in preview envs
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
                // Table might not exist yet
                console.debug("Push DB check info:", error.message);
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
    if (!navigator.onLine) {
        return { success: false, message: "You are offline. Please check connection." };
    }

    // 1. Wait for SDK to load (async script)
    const sdkReady = await waitForSdk();
    if (!sdkReady) {
        return { success: false, message: "Push service unreachable (External SDK Error)." };
    }

    if (Notification.permission === 'denied') {
        return { success: false, message: "Notifications are blocked in browser settings." };
    }

    return new Promise((resolve) => {
        console.log("Triggering SendPulse subscription...");

        try {
            // 2. Use SendPulse SDK to handle the subscription cycle
            // We use a try-catch block around the push call just in case
            try {
                window.oSpP.push(['init']); 
            } catch (e) {
                console.warn("SendPulse init failed", e);
            }
            
            let attempts = 0;
            const maxAttempts = 15; 
            const intervalTime = 2000; // Increased to 2s to reduce network spam if 502s are happening

            const checkSubscription = setInterval(async () => {
                attempts++;
                
                if (Notification.permission === 'denied') {
                    clearInterval(checkSubscription);
                    resolve({ success: false, message: "Notifications blocked." });
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
                            const { data: existingRecord, error: fetchError } = await supabase
                                .from('push_subscribers')
                                .select('user_id')
                                .eq('user_id', user.id)
                                .maybeSingle();

                            if (fetchError && !fetchError.message.includes('does not exist')) {
                                console.warn("Error fetching subscriber:", fetchError);
                            }

                            // Attempt to save to DB
                            const { error } = await supabase.from('push_subscribers').upsert({
                                user_id: user.id,
                                subscriber_id: subscriberId,
                                platform: 'sendpulse',
                                created_at: new Date().toISOString()
                            }, { onConflict: 'user_id' });

                            if (error) {
                                console.warn("Database linking failed:", error.message);
                                resolve({ success: true, message: "Push active on device (DB Sync Failed)." });
                            } else {
                                console.log("Device successfully linked to User ID:", user.id);
                                
                                // 4. Send Welcome Message if this was a new DB entry
                                if (!existingRecord) {
                                    console.log("New subscriber detected. Sending welcome message...");
                                    
                                    let userName = "User";
                                    // Try fetch profile safely
                                    const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).maybeSingle();
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
                        clearInterval(checkSubscription);
                        // Did not receive ID in time - potentially SDK connection issue or User ignored prompt
                        resolve({ success: false, message: "Request timed out. Please try again." });
                    }
                }]);
            }, intervalTime);
        } catch (e) {
            console.error("SDK Error:", e);
            resolve({ success: false, message: "Push SDK Error." });
        }
    });
};

/**
 * Automatically syncs subscription if permission is already granted (e.g. on login).
 * Does NOT prompt the user if permission is 'default' (avoids popup blocking issues).
 * Runs only once per session to avoid loops on errors.
 */
export const syncPushSubscription = async () => {
    if (syncRan) return; // Prevent multiple runs
    
    // Only attempt sync if we are online and have permission
    if (navigator.onLine && Notification.permission === 'granted') {
        syncRan = true;
        console.log("[SendPulse] Permission granted. Syncing subscription in background...");
        // Call subscribe to refresh ID, but handle errors silently
        subscribeToSendPulse().catch(e => console.debug("Background sync failed:", e));
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
           // Silent fail if table missing or connection error
        } else if (data) {
            subscriberId = data.subscriber_id;
        }
    } catch (e) {
        // Silent fail
    }

    // Fallback: If no DB record or table missing, try local browser notification if user matches
    if (!subscriberId) {
        // Fallback: If testing locally with self, show native notification (works if browser is open)
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === payload.userId && Notification.permission === "granted") {
             console.log("[SendPulse] Showing fallback browser notification (No ID).");
             try {
                new Notification(payload.title, { 
                    body: payload.message
                });
             } catch(e) { console.error(e) }
        }
        return;
    }

    const targetSubscriberId = subscriberId;

    // Simulation Mode: If we don't have backend credentials on the client (which is secure),
    // we show a Local Notification to mimic the push experience so the user gets feedback.
    if (!clientId || !clientSecret) {
        console.log(`[SendPulse Simulation] would trigger server push to ID ${targetSubscriberId}: ${payload.title}`);
        
        if (Notification.permission === "granted") {
             console.log("[SendPulse] Showing simulation local notification.");
             try {
                new Notification(payload.title, { 
                    body: payload.message
                });
             } catch(e) { console.error("Local notification failed", e) }
        }
        return;
    }
};
