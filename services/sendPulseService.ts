
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
        const registration = await navigator.serviceWorker.getRegistration();
        status.serviceWorker = !!registration;
    }

    // Check DB
    if (userId) {
        const { data } = await supabase.from('push_subscribers').select('subscriber_id').eq('user_id', userId).single();
        if (data) {
            status.dbLinked = true;
            status.subscriberId = data.subscriber_id;
        }
    }

    return status;
};


/**
 * Requests permission for Web Push via SendPulse SDK AND links the ID to the Supabase User.
 * This ensures the user appears in the SendPulse dashboard as a subscriber.
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
        // This ensures the Service Worker is engaged and the Token is sent to SendPulse servers
        window.oSpP.push(['init']); 
        
        // We attempt to get the ID. If the user hasn't subscribed yet, SendPulse will prompt them.
        // If they have, it returns the ID.
        
        // Polling function to wait for the ID
        let attempts = 0;
        const maxAttempts = 20; // Try for 10 seconds (20 * 500ms)

        const checkSubscription = setInterval(async () => {
            attempts++;
            
            // Check native permission first
            if (Notification.permission === 'denied') {
                clearInterval(checkSubscription);
                resolve({ success: false, message: "Notifications are blocked in browser settings." });
                return;
            }

            // Ask SendPulse for the ID
            window.oSpP.push(['getID', async function(subscriberId: string) {
                if (subscriberId) {
                    clearInterval(checkSubscription);
                    console.log("SendPulse ID received:", subscriberId);

                    // 3. Link to Supabase User
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    if (user) {
                        const { error } = await supabase.from('push_subscribers').upsert({
                            user_id: user.id,
                            subscriber_id: subscriberId,
                            platform: 'sendpulse',
                            created_at: new Date().toISOString()
                        }, { onConflict: 'user_id' });

                        if (error) {
                            console.error("Failed to link push sub to user:", error);
                            resolve({ success: true, message: "Subscribed, but database linking failed." });
                        } else {
                            console.log("Device successfully linked to User ID:", user.id);
                            resolve({ success: true, message: "Notifications active and linked." });
                        }
                    } else {
                        resolve({ success: true, message: "Notifications active (Guest mode)." });
                    }
                } else if (attempts >= maxAttempts) {
                    // Timeout
                    clearInterval(checkSubscription);
                    
                    // If we timed out, force the prompt
                    if (Notification.permission === 'default') {
                        // This forces the native browser prompt if SendPulse didn't trigger it
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

/**
 * Unsubscribes from SendPulse notifications.
 */
export const unsubscribeFromSendPulse = async (): Promise<void> => {
     console.log("User requested unsubscribe.");
     
     const { data: { user } } = await supabase.auth.getUser();
     if (user) {
         // Remove from our DB
         await supabase.from('push_subscribers').delete().eq('user_id', user.id);
     }
     
     // Note: We cannot programmatically revoke browser permission (user must do it manually),
     // but we can remove the link in our database so we stop sending to them.
}


interface SendPushPayload {
    userId: string;
    title: string;
    message: string;
    url?: string;
}

/**
 * Sends a Web Push Notification via SendPulse REST API.
 * This is the function that allows OFFLINE sending (Server-to-Server).
 */
export const sendSendPulseNotification = async (payload: SendPushPayload): Promise<void> => {
    const clientId = testClientId;
    const clientSecret = testClientSecret;
    
    // 1. Look up the specific Subscriber ID for this User ID
    const { data: subscriberData } = await supabase
        .from('push_subscribers')
        .select('subscriber_id')
        .eq('user_id', payload.userId)
        .single();

    if (!subscriberData?.subscriber_id) {
        console.log(`[SendPulse] Skipped. No registered device found for User ${payload.userId}`);
        
        // Fallback: If testing locally with self, show native notification (works only if online)
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === payload.userId && Notification.permission === "granted") {
             new Notification(payload.title, { body: payload.message });
        }
        return;
    }

    const targetSubscriberId = subscriberData.subscriber_id;

    if (!clientId || !clientSecret) {
        // If we don't have API keys loaded in client (Admin Broadcast), we assume 
        // this function is being called or mocked. 
        // In Production, this logic usually happens in the Supabase Edge Function.
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
        // Docs: https://sendpulse.com/integrations/api/push
        // We use the 'tasks' endpoint to send to a specific list of subscriber IDs (even if just 1)
        const pushResponse = await fetch('https://api.sendpulse.com/push/tasks', {
             method: 'POST',
             headers: {
                 'Authorization': `Bearer ${tokenData.access_token}`,
                 'Content-Type': 'application/json'
             },
             body: JSON.stringify({
                 title: payload.title,
                 body: payload.message,
                 // website_id is optional if you have only 1 site, but good to be specific if you have multiple
                 ttl: 86400, // Live for 24 hours
                 link: payload.url,
                 filter: {
                     variable_name: 'id', 
                     operator: 'or',
                     value: [targetSubscriberId] // SendPulse accepts the ID here to target specific user
                 }
             })
        });
        
        const pushResult = await pushResponse.json();
        console.log(`[SendPulse] API Response:`, pushResult);

    } catch (error) {
        console.error("Failed to interact with SendPulse API:", error);
    }
};
