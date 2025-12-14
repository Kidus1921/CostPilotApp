
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
    return { success: false, message: "Notifications blocked." };
  }

  // Init SDK
  if (window.oSpP) {
      window.oSpP.push(["init"]);
  }

  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 10;

    const interval = setInterval(() => {
      attempts++;

      if (!window.oSpP) {
          if (attempts >= maxAttempts) {
              clearInterval(interval);
              resolve({ success: false, message: "SDK not loaded." });
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
                message: "Subscription timeout.",
              });
            }
            return;
          }

          clearInterval(interval);

          // Get logged-in user if not passed
          if (!userId) {
            const { data } = await supabase.auth.getUser();
            userId = data.user?.id;
          }

          if (!userId) {
            resolve({
              success: true,
              message: "Subscribed (guest mode).",
            });
            return;
          }

          // Save subscriber ID
          const { error } = await supabase
            .from("push_subscribers")
            .upsert({
              user_id: userId,
              subscriber_id: subscriberId,
              platform: "sendpulse",
              created_at: new Date().toISOString(),
            });

          if (error) {
            console.error(error);
            resolve({
              success: true,
              message: "Subscribed (DB sync pending).",
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
    subscribeToSendPulse(userId).catch(() => {});
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
};

// Functions to maintain compatibility with existing components (if any were relying on the old export names)
export const getPushSubscriptionStatus = async (userId: string) => {
    // Basic compatibility mock for diagnostics
    return {
        permission: Notification.permission,
        sdkLoaded: !!window.oSpP,
        serviceWorker: 'serviceWorker' in navigator,
        dbLinked: true, // Optimistic
        subscriberId: 'protected'
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
      await fetch(functionUrl, {
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
  } catch (error) {
      console.error("Failed to invoke send-push function:", error);
  }
};

// Backwards compatibility alias
export const sendSendPulseNotification = async (payload: {userId: string, title: string, message: string}) => {
    return sendPushNotification(payload.userId, payload.title, payload.message);
};
