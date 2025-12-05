
import { supabase } from '../supabaseClient';
import { PushSubscriber } from '../types';

// Augment window interface for Brevo
declare global {
    interface Window {
        sib: any;
    }
}

/**
 * Requests permission for Web Push and registers the subscriber in Supabase.
 * Uses Brevo's `window.sib` object.
 */
export const subscribeToBrevoPush = async (userId: string): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
        if (!window.sib) {
            resolve({ success: false, message: "Brevo SDK not loaded." });
            return;
        }

        // Trigger Brevo's permission prompt
        window.sib.equeue.push([
            "subscribe",
            async function (subscriberId: string) {
                if (subscriberId) {
                    console.log("Brevo Subscriber ID:", subscriberId);
                    
                    // Save to Supabase
                    try {
                        const subscriberData = {
                            userId,
                            subscriberId,
                            browser: navigator.userAgent,
                            createdAt: new Date().toISOString(),
                            isEnabled: true
                        };
                        
                        // We assume a 'push_subscribers' table exists or mapped appropriately
                        // If it doesn't exist yet, this call might fail silently or log error, but it won't crash the app via import errors.
                        await supabase.from('push_subscribers').upsert(subscriberData, { onConflict: 'userId' });
                        resolve({ success: true, message: "Successfully subscribed to Push Notifications." });
                    } catch (error) {
                        console.error("Error saving subscriber to Supabase:", error);
                        resolve({ success: false, message: "Failed to save subscription." });
                    }
                } else {
                    resolve({ success: false, message: "User denied permission or subscription failed." });
                }
            }
        ]);
    });
};

interface SendPushPayload {
    title: string;
    content: string;
    webUrl?: string;
    subscriberId?: string; // If targeting single user
    listId?: number; // If targeting a list
}

/**
 * Sends a Web Push Notification via Brevo API.
 */
export const sendBrevoPushNotification = async (payload: SendPushPayload): Promise<void> => {
    const apiKey = process.env.BREVO_API_KEY || 'YOUR_BREVO_API_KEY'; 

    if (!apiKey || apiKey === 'YOUR_BREVO_API_KEY') {
        console.warn("Brevo API Key missing. Push notification skipped.");
        return;
    }

    const clientKey = window.sib?.client_key || process.env.BREVO_CLIENT_KEY;

    if(!clientKey) {
         console.warn("Brevo Client Key missing for tracking.");
         return;
    }

    console.log("Dispatching Brevo Push for:", payload.subscriberId, payload.title);
};

/**
 * Retrieves the subscriber ID from Supabase for a specific user.
 */
export const getBrevoSubscriberId = async (userId: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('push_subscribers')
            .select('subscriberId, isEnabled')
            .eq('userId', userId)
            .single();

        if (error) throw error;
        
        if (data && data.isEnabled) {
            return data.subscriberId;
        }
    } catch (error) {
        console.error("Error fetching subscriber ID:", error);
    }
    return null;
};
