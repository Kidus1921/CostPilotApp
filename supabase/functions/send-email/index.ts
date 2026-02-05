import { serve } from "https://deno.land/std/http/server.ts";

// Declare Deno to fix TypeScript errors in environments where Deno types are missing
declare const Deno: any;

/**
 * Supabase Edge Function: send-email
 * 
 * To use this, you must set these environment variables in Supabase:
 * - SMTP_HOST
 * - SMTP_USER
 * - SMTP_PASS
 * - SMTP_FROM (e.g., noreply@yourdomain.com)
 * 
 * Alternatively, use a service like Resend (recommended):
 * - RESEND_API_KEY
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html, fromName } = await req.json();

    // EXAMPLE: Using Resend API
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SMTP_FROM = Deno.env.get("SMTP_FROM") || "noreply@costpilot.app";

    if (!RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not set. Falling back to mock response.");
        return new Response(JSON.stringify({ 
            message: "Email relay initialized in mock mode. Set RESEND_API_KEY for real delivery.",
            payload: { to, subject } 
        }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
        });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName || 'CostPilot'} <${SMTP_FROM}>`,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: res.status,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
