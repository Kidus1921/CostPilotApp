
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
    // Skip checking in preview environments to avoid "Origin mismatch" errors.
    const isPreview = window.location.hostname.includes('usercontent.goog') || 
                      window.location.hostname.includes('ai.studio') ||
                      window.location.hostname.includes('webcontainer.io');

    if ('serviceWorker' in navigator && !isPreview) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            status.serviceWorker = !!registration;
        } catch (e) {
            console.debug("Service Worker check skipped:", e);
        }
    }

    // Check DB
    if (userId) {
        try {
            // Use maybeSingle to avoid errors if no row is found
            const { data, error } = await supabase
                .from('push_subscribers')
                .select('subscriber_id')
                .eq('user_id', userId)
                .maybeSingle();

            if (data) {
                status.dbLinked = true;
                status.subscriberId = data.subscriber_id;
            } else if (error) {
                // If the table is missing, this will return a 400 error. 
                // We log it as debug to reduce noise, as functionality will degrade gracefully.
                console.debug("Push DB check info (likely table missing):", error.message);
            }
        } catch (err) {
            console.warn("Push subscriber check failed:", err);
        }
    }

    return status;
};


/**
 * Requests permission for Web Push via SendPulse SDK AND links the ID to the Supabase User.
 */
export const subscribeToSendPulse = async (): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
        // 1. Check if SendPulse SDK is loaded
        if (!window.oSpP) {
            resolve({ success: false, message: "Push service not ready. Check your internet connection." });
            return;
        }

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

            window.oSpP.push(['getID', async function(subscriberId: string) {
                if (subscriberId) {
                    clearInterval(checkSubscription);
                    console.log("SendPulse ID received:", subscriberId);

                    // 3. Link to Supabase User
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    if (user) {
                        // Attempt to save to DB, handle error if table doesn't exist
                        const { error } = await supabase.from('push_subscribers').upsert({
                            user_id: user.id,
                            subscriber_id: subscriberId,
                            platform: 'sendpulse',
                            created_at: new Date().toISOString()
                        }, { onConflict: 'user_id' });

                        if (error) {
                            console.warn("Database linking failed (Table 'push_subscribers' might be missing):", error.message);
                            // Resolve success anyway because the browser-side subscription worked
                            resolve({ success: true, message: "Push active (Device only)." });
                        } else {
                            console.log("Device successfully linked to User ID:", user.id);
                            resolve({ success: true, message: "Notifications active and linked." });
                        }
                    } else {
                        resolve({ success: true, message: "Notifications active (Guest mode)." });
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkSubscription);
                    if (Notification.permission === 'default') {
                        Notification.requestPermission(); 
                        resolve({ success: false, message: "Please click 'Allow' on the browser prompt and try again." });
                    } else {
                        resolve({ success: false, message: "Could not retrieve Subscriber ID from SendPulse." });
                    }
                }
            }]);
        }, 500);
    });
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
            // If table missing (400) or RLS error
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
             // Removed icon property to prevent 404 error on /favicon.ico
             new Notification(payload.title, { 
                 body: payload.message
             });
        }
        return;
    }

    const targetSubscriberId = subscriberId;

    if (!clientId || !clientSecret) {
        console.log(`[Mock SendPulse] Would send to Subscriber ID ${targetSubscriberId}: ${payload.title}`);
        return;
    }

    console.log(`Attempting to send to Subscriber ${targetSubscriberId}...`);
    
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
