
import { supabase, PROJECT_URL } from '../supabaseClient';

declare global {
  interface Window {
    oSpP: any;
  }
}

let syncRan = false;

/* ----------------------------------
   Init SendPulse SDK
---------------------------------- */
export const initSendPulse = (userId: string) => {
  if (typeof window !== "undefined" && !window.oSpP) {
    window.oSpP = [];
  }
};

/* ----------------------------------
   Subscribe User to Push
---------------------------------- */
export const subscribeToSendPulse = async (
  userId?: string
): Promise<{ success: boolean; message: string }> => {
  if (!navigator.onLine) {
    return { success: false, message: "You are offline." };
  }

  // 1. Check/Request Permission (Native)
  if (Notification.permission === "default") {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            return { success: false, message: "Permission denied." };
        }
    } catch (e) {
        return { success: false, message: "Could not request permission." };
    }
  }

  if (Notification.permission !== "granted") {
    return { success: false, message: "Notifications blocked. Please enable them in browser settings." };
  }

  // 2. Trigger SendPulse Subscribe
  // This registers the service worker and gets the ID from SendPulse servers
  if (typeof window !== "undefined") {
    if (!window.oSpP) {
        window.oSpP = [];
    }
    // Explicitly call subscribe as per SendPulse requirements for some envs
    window.oSpP.push(["init"]);
    window.oSpP.push(["subscribe"]);
  } else {
      return { success: false, message: "SendPulse SDK not loaded." };
  }

  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20; // Wait ~30s

    const interval = setInterval(() => {
      attempts++;

      // Safety check if SDK is really loaded
      if (!window.oSpP) {
           if (attempts >= maxAttempts) {
              clearInterval(interval);
              resolve({ success: false, message: "SendPulse SDK not loaded." });
           }
           return;
      }

      window.oSpP.push([
        "getID",
        async (subscriberId: string | null) => {
          if (!subscriberId) {
            if (attempts >= maxAttempts) {
              clearInterval(interval);
              resolve({
                success: false,
                message: "Subscription timeout. Service Worker may be missing or domain mismatch.",
              });
            }
            return;
          }

          clearInterval(interval);
          console.log("✅ SendPulse Subscriber ID:", subscriberId);

          // Get logged-in user if not passed
          if (!userId) {
            const { data } = await supabase.auth.getUser();
            userId = data.user?.id;
          }

          if (!userId) {
            resolve({
              success: true,
              message: "Subscribed (guest mode - ID not saved).",
            });
            return;
          }

          // Save subscriber ID to Supabase
          const { error } = await supabase
            .from("push_subscribers")
            .upsert({
              user_id: userId,
              subscriber_id: subscriberId,
              platform: "sendpulse",
              created_at: new Date().toISOString(),
            }, { onConflict: 'user_id,subscriber_id' });

          if (error) {
            console.error("Supabase upsert error:", error);
            // We resolve success because the push subscription itself worked on the client
            resolve({
              success: true,
              message: "Subscribed (DB sync pending/failed).",
            });
            return;
          }

          resolve({
            success: true,
            message: "Push notifications enabled.",
          });
        },
      ]);
    }, 1500);
  });
};

/* ----------------------------------
   Background Sync (on login)
---------------------------------- */
export const syncPushSubscription = async (userId?: string) => {
  if (syncRan) return;

  if (Notification.permission === "granted") {
    syncRan = true;
    // We run the subscribe flow silently to ensure ID is synced
    subscribeToSendPulse(userId).catch(console.error);
  }
};

/* ----------------------------------
   Unsubscribe
---------------------------------- */
export const unsubscribeFromSendPulse = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  await supabase
    .from("push_subscribers")
    .delete()
    .eq("user_id", data.user.id);
    
  // Attempt to unsubscribe from SDK if possible (SendPulse SDK doesn't always expose easy unsubscribe)
};

// Functions to maintain compatibility with existing components (if any were relying on the old export names)
export const getPushSubscriptionStatus = async (userId: string) => {
    let subscriberId = null;
    let dbLinked = false;
    
    // Check DB
    const { data } = await supabase.from('push_subscribers').select('subscriber_id').eq('user_id', userId).maybeSingle();
    if (data) {
        dbLinked = true;
        subscriberId = data.subscriber_id;
    }

    return {
        permission: Notification.permission,
        sdkLoaded: !!window.oSpP,
        serviceWorker: 'serviceWorker' in navigator,
        dbLinked,
        subscriberId
    };
};

/* ----------------------------------
   Send Push (CALLS BACKEND)
---------------------------------- */
export const sendPushNotification = async (
  userId: string,
  title: string,
  message: string
) => {
  const { data } = await supabase
    .from("push_subscribers")
    .select("subscriber_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.subscriber_id) {
    console.warn("User not subscribed to push notifications");
    return;
  }

  const session = (await supabase.auth.getSession()).data.session;

  // Use PROJECT_URL from supabaseClient.ts
  const functionUrl = `${PROJECT_URL}/functions/v1/send-push`;

  try {
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          subscriberId: data.subscriber_id,
          title,
          message,
          url: window.location.origin,
        }),
      });
      if (!res.ok) {
          const text = await res.text();
          console.error("Push Function Error:", text);
      }
  } catch (error) {
      console.error("Failed to invoke send-push function:", error);
  }
};

// Backwards compatibility alias
export const sendSendPulseNotification = async (payload: {userId: string, title: string, message: string}) => {
    return sendPushNotification(payload.userId, payload.title, payload.message);
};
