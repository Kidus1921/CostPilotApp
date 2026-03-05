
import { supabase } from '../supabaseClient';

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
  if (typeof window !== "undefined") {
    // Ensure SDK stack exists
    window.oSpP = window.oSpP || [];
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

  if (typeof window === "undefined") {
    return { success: false, message: "Browser only feature." };
  }

  // Ensure SDK stack exists
  window.oSpP = window.oSpP || [];

  // 🚨 DO NOT REQUEST PERMISSION MANUALLY
  // SendPulse SDK must handle this itself

  console.log("[SendPulse] Calling subscribe()");

  // This triggers:
  // - Permission popup
  // - Service worker registration
  // - Subscriber ID creation
  window.oSpP.push(["subscribe"]);

  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20;

    const interval = setInterval(() => {
      attempts++;

      window.oSpP.push([
        "getID",
        async (subscriberId: string | null) => {
          if (!subscriberId) {
            if (attempts >= maxAttempts) {
              clearInterval(interval);
              resolve({
                success: false,
                message:
                  "Subscription failed. Check service-worker.js and domain.",
              });
            }
            return;
          }

          clearInterval(interval);
          console.log("✅ SendPulse Subscriber ID:", subscriberId);

          // Resolve user
          if (!userId) {
            // Use type casting to bypass property existence check on SupabaseAuthClient
            const { data } = await (supabase.auth as any).getUser();
            userId = data.user?.id;
          }

          if (!userId) {
            resolve({
              success: true,
              message: "Subscribed (guest mode).",
            });
            return;
          }

          // Save to DB
          const { error } = await supabase
            .from("push_subscribers")
            .upsert(
              {
                user_id: userId,
                subscriber_id: subscriberId,
                platform: "sendpulse",
                created_at: new Date().toISOString(),
              },
              { onConflict: "user_id,subscriber_id" }
            );

          if (error) {
            console.error("Supabase error:", error);
            resolve({
              success: true,
              message: "Subscribed (DB sync failed).",
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

  // Only auto-subscribe if permission is already GRANTED
  if (Notification.permission === "granted") {
    syncRan = true;
    subscribeToSendPulse(userId).catch(console.error);
  }
};

/* ----------------------------------
   Unsubscribe
---------------------------------- */
export const unsubscribeFromSendPulse = async () => {
  // Use type casting to bypass property existence check on SupabaseAuthClient
  const { data } = await (supabase.auth as any).getUser();
  if (!data.user) return;

  await supabase
    .from("push_subscribers")
    .delete()
    .eq("user_id", data.user.id);
    
  // SDK unsubscribe logic (if available via global object) would go here
};

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
