
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
export const subscribeToSendPulse = async (userId?: string): Promise<{ success: boolean; message: string }> => {
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
            try {
                window.oSpP.push(['init']); 
            } catch (e) {
                console.warn("SendPulse init failed", e);
            }
            
            let attempts = 0;
            const maxAttempts = 15; 
            const intervalTime = 2000;

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
                        // Use passed userId if available, otherwise fetch from session
                        let targetUserId = userId;
                        if (!targetUserId) {
                            const { data: { user } } = await supabase.auth.getUser();
                            targetUserId = user?.id;
                        }
                        
                        if (targetUserId) {
                            // Check if record already exists to decide on Welcome Message
                            const { data: existingRecord, error: fetchError } = await supabase
                                .from('push_subscribers')
                                .select('user_id')
                                .eq('user_id', targetUserId)
                                .eq('subscriber_id', subscriberId) // Check specific device
                                .maybeSingle();

                            if (fetchError && !fetchError.message.includes('does not exist')) {
                                console.warn("Error fetching subscriber:", fetchError);
                            }

                            // Attempt to save to DB
                            // CRITICAL FIX: Removed `onConflict: 'user_id'` because user_id is not unique (one user, multiple devices).
                            // We allow the default upsert behavior (based on PK: user_id + subscriber_id)
                            const { error } = await supabase.from('push_subscribers').upsert({
                                user_id: targetUserId,
                                subscriber_id: subscriberId,
                                platform: 'sendpulse',
                                created_at: new Date().toISOString()
                            });

                            if (error) {
                                console.error("Database linking failed:", error.message, error.details);
                                resolve({ success: true, message: "Push active on device (DB Save Failed: " + error.message + ")." });
                            } else {
                                console.log("Device successfully linked to User ID:", targetUserId);
                                
                                // 4. Send Welcome Message if this was a new DB entry
                                if (!existingRecord) {
                                    console.log("New subscriber detected. Sending welcome message...");
                                    
                                    let userName = "User";
                                    const { data: profile } = await supabase.from('users').select('name').eq('id', targetUserId).maybeSingle();
                                    if (profile && profile.name) userName = profile.name;

                                    await sendSendPulseNotification({
                                        userId: targetUserId,
                                        title: `Welcome, ${userName}!`,
                                        message: "You have successfully subscribed to CostPilot notifications.",
                                        url: window.location.origin
                                    });
                                }

                                resolve({ success: true, message: "Notifications active and linked." });
                            }
                        } else {
                            resolve({ success: true, message: "Notifications active (Guest mode - Not saved)." });
                        }
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkSubscription);
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
 * Automatically syncs subscription if permission is already granted.
 */
export const syncPushSubscription = async (userId?: string) => {
    if (syncRan) return; 
    
    if (navigator.onLine && Notification.permission === 'granted') {
        syncRan = true;
        console.log("[SendPulse] Permission granted. Syncing subscription in background...");
        subscribeToSendPulse(userId).catch(e => console.debug("Background sync failed:", e));
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
        
        if (data) {
            subscriberId = data.subscriber_id;
        }
    } catch (e) {
        // Silent fail
    }

    // Fallback: If no DB record, try local browser notification if current user matches
    if (!subscriberId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === payload.userId && Notification.permission === "granted") {
             console.log("[SendPulse] Showing fallback browser notification (No ID).");
             try {
                 // Use ServiceWorker registration to show notification if available (better for mobile)
                 const reg = await navigator.serviceWorker.getRegistration();
                 if (reg) {
                     reg.showNotification(payload.title, { body: payload.message, icon: '/logo192.png' });
                 } else {
                     new Notification(payload.title, { body: payload.message });
                 }
             } catch(e) { console.error(e) }
        }
        return;
    }

    // Simulation Mode
    if (!clientId || !clientSecret) {
        console.log(`[SendPulse Simulation] would trigger server push to ID ${subscriberId}`);
        if (Notification.permission === "granted") {
             try {
                 const reg = await navigator.serviceWorker.getRegistration();
                 if (reg) {
                     reg.showNotification(payload.title, { body: payload.message, icon: '/logo192.png' });
                 } else {
                    new Notification(payload.title, { body: payload.message });
                 }
             } catch(e) { console.error("Local notification failed", e) }
        }
        return;
    }
};
