
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
    // We just ensure the script is loaded here. 
    // The actual linking happens when the user clicks "Activate" in settings.
    if (!window.oSpP) {
        console.log("SendPulse SDK not loaded yet.");
    }
};

/**
 * Requests permission for Web Push via SendPulse AND links the ID to the Supabase User.
 */
export const subscribeToSendPulse = async (): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
        // 1. Check if SendPulse SDK is loaded
        if (!window.oSpP) {
            resolve({ success: false, message: "Push service not ready. Please refresh the page." });
            return;
        }

        console.log("Triggering SendPulse subscription...");

        // 2. Request Browser Permission
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                
                // 3. Get the SendPulse Subscriber ID
                // We assume the SendPulse script (from index.html) has initialized `oSpP`
                window.oSpP.push(['getID', async function(subscriberId: string) {
                    if (subscriberId) {
                        console.log("SendPulse ID received:", subscriberId);
                        
                        // 4. Link to Supabase User
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
                                resolve({ success: true, message: "Notifications allowed, but server linking failed." });
                            } else {
                                console.log("Device successfully linked to User ID:", user.id);
                                resolve({ success: true, message: "Notifications active and device linked." });
                            }
                        } else {
                            resolve({ success: true, message: "Notifications allowed (Guest mode)." });
                        }

                    } else {
                        console.warn("Permission granted, but no Subscriber ID returned yet. (It might take a moment)");
                        resolve({ success: true, message: "Notifications allowed. Device syncing..." });
                    }
                }]);

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
     console.log("User requested unsubscribe.");
     // Ideally, we would also remove the row from 'push_subscribers' here
     const { data: { user } } = await supabase.auth.getUser();
     if (user) {
         await supabase.from('push_subscribers').delete().eq('user_id', user.id);
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
    const { data: subscriberData } = await supabase
        .from('push_subscribers')
        .select('subscriber_id')
        .eq('user_id', payload.userId)
        .single();

    if (!subscriberData?.subscriber_id) {
        console.log(`[SendPulse] Skipped. No registered device found for User ${payload.userId}`);
        
        // Fallback: If testing locally with self, show native notification
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === payload.userId && Notification.permission === "granted") {
             new Notification(payload.title, { body: payload.message });
        }
        return;
    }

    const targetSubscriberId = subscriberData.subscriber_id;

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
        // Docs: https://sendpulse.com/integrations/api/push
        const pushResponse = await fetch('https://api.sendpulse.com/push/tasks', {
             method: 'POST',
             headers: {
                 'Authorization': `Bearer ${tokenData.access_token}`,
                 'Content-Type': 'application/json'
             },
             body: JSON.stringify({
                 title: payload.title,
                 body: payload.message,
                 website_id: 0, // Optional if you have only one website, or fetch via /push/websites
                 ttl: 86400,
                 stretch_time: 0,
                 link: payload.url,
                 // TARGETING SPECIFIC USER:
                 filter: {
                     variable_name: 'id', // This assumes SendPulse internal ID
                     operator: 'or',
                     value: [Number(targetSubscriberId)] // SendPulse often treats IDs as numbers
                 }
                 // Note: Sending to a specific subscriber ID usually requires the 'filter' 
                 // logic or the specific /push/websites/{id}/users endpoint depending on API version.
                 // For simplicity in this mockup, we are logging the intent.
             })
        });

        console.log(`[SendPulse] API Request sent for subscriber ${targetSubscriberId}`);

    } catch (error) {
        console.error("Failed to interact with SendPulse API:", error);
    }
};
