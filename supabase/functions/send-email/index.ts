
import { serve } from "https://deno.land/std/http/server.ts";

// Declare Deno to fix TypeScript errors in non-Deno environments
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * CostPilot Transactional Email Dispatcher
 * Environment Variables Required:
 * - RESEND_API_KEY
 * - SMTP_FROM (e.g., alerts@costpilot.app)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html, fromName } = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SMTP_FROM = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured in the Edge Function environment.");
    }

    // Wrap the content in the CostPilot Brand Template if not already wrapped
    const brandedHtml = html.includes('id="costpilot-template"') ? html : `
      <div id="costpilot-template" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background-color: #65081b; padding: 30px; text-align: center;">
            <h1 style="color: #d3a200; margin: 0; font-size: 22px; letter-spacing: 4px; text-transform: uppercase; font-weight: 900;">CostPilot</h1>
            <p style="color: rgba(255,255,255,0.5); margin: 5px 0 0 0; font-size: 10px; letter-spacing: 2px; text-transform: uppercase;">Institutional Registry</p>
        </div>
        <div style="padding: 40px; color: #1a1a1a; line-height: 1.6;">
            ${html}
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #f1f1f1;">
            <p style="margin: 0; font-weight: bold; color: #6b7280;">Secure Operational Message</p>
            <p style="margin: 5px 0;">This is an automated system dispatch. Please do not reply.</p>
            <p style="margin: 15px 0 0 0; font-size: 9px;">© ${new Date().getFullYear()} CostPilot EDFM Platform</p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName || 'CostPilot System'} <${SMTP_FROM}>`,
        to: [to],
        subject: subject,
        html: brandedHtml,
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