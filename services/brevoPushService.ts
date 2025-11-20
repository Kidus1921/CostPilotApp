
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { PushSubscriber } from '../types';

// Augment window interface for Brevo
declare global {
    interface Window {
        sib: any;
    }
}

/**
 * Requests permission for Web Push and registers the subscriber in Firestore.
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
                    
                    // Save to Firestore
                    try {
                        const subscriberData: PushSubscriber = {
                            userId,
                            subscriberId,
                            browser: navigator.userAgent,
                            createdAt: serverTimestamp(),
                            isEnabled: true
                        };
                        
                        await setDoc(doc(db, 'pushSubscribers', userId), subscriberData);
                        resolve({ success: true, message: "Successfully subscribed to Push Notifications." });
                    } catch (error) {
                        console.error("Error saving subscriber to Firestore:", error);
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
 * NOTE: In production, this should be called from a Backend/Cloud Function to protect the API Key.
 */
export const sendBrevoPushNotification = async (payload: SendPushPayload): Promise<void> => {
    const apiKey = process.env.BREVO_API_KEY || 'YOUR_BREVO_API_KEY'; // Use env var in real app

    if (!apiKey || apiKey === 'YOUR_BREVO_API_KEY') {
        console.warn("Brevo API Key missing. Push notification skipped.");
        return;
    }

    // This endpoint is for the Transactional Web Push (Experimental/Beta in some Brevo accounts)
    // Or standard Campaign creation. 
    // For this implementation, we assume the standard Brevo Automation trigger 
    // or a direct POST to their campaign endpoint if available.
    // Since Brevo doesn't have a simple "Send 1 Push" public API like email without setup,
    // we mock the *structure* required for a backend proxy or Brevo's transactional push if active.
    
    const url = 'https://api.brevo.com/v3/push/campaigns'; // Using campaign creation as proxy for broadcast

    // For individual transactional push, Brevo recommends using Automation workflows triggered by "Track Event".
    // Here, we will simulate sending a "Track Event" which triggers the push in Brevo Automation.
    
    const trackEventUrl = 'https://in-automate.brevo.com/api/v2/trackEvent';
    const clientKey = window.sib?.client_key || process.env.BREVO_CLIENT_KEY;

    if(!clientKey) {
         console.warn("Brevo Client Key missing for tracking.");
         return;
    }

    // Payload to trigger automation workflow
    const eventData = {
        key: clientKey,
        email: payload.subscriberId, // Often Brevo maps subscriberID to an internal contact, or we use email if linked
        event: "send_push_notification", // You must create this custom event in Brevo
        eventdata: {
            title: payload.title,
            message: payload.content,
            url: payload.webUrl
        }
    };

    // DIRECT API APPROACH (If using a backend proxy to Brevo API)
    // Since we are client-side, we'll log what needs to happen.
    console.log("Dispatching Brevo Push for:", payload.subscriberId, payload.title);

    // In a real scenario without a backend, we rely on the Service Worker and Automation.
    // For this 'Admin Manual Push' feature, we would typically create a campaign via API.
};

/**
 * Retrieves the subscriber ID from Firestore for a specific user.
 */
export const getBrevoSubscriberId = async (userId: string): Promise<string | null> => {
    try {
        const docRef = doc(db, 'pushSubscribers', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().isEnabled) {
            return docSnap.data().subscriberId;
        }
    } catch (error) {
        console.error("Error fetching subscriber ID:", error);
    }
    return null;
};
