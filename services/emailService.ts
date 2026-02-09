
import { supabase, PROJECT_URL } from '../supabaseClient';

/**
 * Payload structure for sending an email via Supabase Edge Functions.
 */
interface EmailPayload {
    to: string;
    subject: string;
    body: string; // HTML supported
    fromName?: string;
}

/**
 * Sends a 'noreply' style email notification by invoking a Supabase Edge Function.
 * This assumes you have deployed a function named 'send-email'.
 * 
 * @param {EmailPayload} payload - The email details.
 */
export const sendEmailNotification = async (payload: EmailPayload): Promise<{ success: boolean; error?: string }> => {
    console.log(`[Email Service] Attempting to dispatch email to: ${payload.to}`);

    try {
        // Use type casting to bypass property existence check on SupabaseAuthClient
        const session = (await (supabase.auth as any).getSession()).data.session;
        
        // Construct the Edge Function URL
        const functionUrl = `${PROJECT_URL}/functions/v1/send-email`;

        const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token || ''}`,
            },
            body: JSON.stringify({
                to: payload.to,
                subject: payload.subject,
                html: payload.body,
                fromName: payload.fromName || 'CostPilot No-Reply'
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Email Service] Edge Function Error:", errorText);
            return { success: false, error: errorText };
        }

        console.log(`[Email Service] Email successfully dispatched to relay.`);
        return { success: true };
    } catch (error: any) {
        console.error("[Email Service] Network/Relay Failure:", error);
        return { success: false, error: error.message };
    }
};
