
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Declare Deno to fix TypeScript errors in non-Deno environments
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    // 1. Fetch In-Progress Projects that have an end date and joined lead data
    const { data: projects, error: fetchError } = await supabaseClient
      .from('projects')
      .select(`
        id, 
        title, 
        endDate, 
        teamLeader
      `)
      .neq('status', 'Completed')
      .neq('status', 'Rejected');

    if (fetchError) throw fetchError;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let alertsSent = 0;

    for (const project of (projects || [])) {
      if (!project.endDate || !project.teamLeader?.email) continue;

      const endDate = new Date(project.endDate);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Trigger alerts for Overdue (negative) or Due Today (zero)
      if (diffDays <= 0) {
        const isOverdue = diffDays < 0;
        const statusLabel = isOverdue ? `CRITICAL: OVERDUE BY ${Math.abs(diffDays)} DAYS` : "URGENT: DUE TODAY";
        const accentColor = isOverdue ? "#c41034" : "#d3a200";

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `CostPilot Operational Registry <${FROM_EMAIL}>`,
            to: [project.teamLeader.email],
            subject: `🚨 Alert: ${project.title} - ${isOverdue ? 'Overdue' : 'Due Today'}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: white;">
                <div style="background: #65081b; padding: 20px; text-align: center;">
                  <h2 style="color: #d3a200; margin: 0; font-size: 18px; letter-spacing: 2px;">OPERATIONAL ALERT</h2>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px;">Hello <strong>${project.teamLeader.name}</strong>,</p>
                  <p>Our system has detected a project in your portfolio that requires immediate attention:</p>
                  
                  <div style="background: #f8f8f8; padding: 20px; border-left: 6px solid ${accentColor}; margin: 25px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 12px; color: #666; font-weight: bold; text-transform: uppercase;">Project Identifier</p>
                    <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: 900; color: #1a1a1a;">${project.title}</p>
                    
                    <p style="margin: 0; font-size: 12px; color: #666; font-weight: bold; text-transform: uppercase;">Terminal Status</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 800; color: ${accentColor};">${statusLabel}</p>
                  </div>
                  
                  <p style="font-size: 14px; color: #444;">Please access the <strong>CostPilot Registry</strong> immediately to finalize this scope or request an extension from the Authority Leads.</p>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${Deno.env.get('PUBLIC_APP_URL') || '#'}" style="background: #65081b; color: #d3a200; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Open Registry Terminal</a>
                  </div>
                </div>
                <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 10px; color: #888;">
                  This is an automated diagnostic message. Security Code: ${project.id.slice(0,8).toUpperCase()}
                </div>
              </div>
            `,
          }),
        });

        if (res.ok) alertsSent++;
      }
    }

    return new Response(JSON.stringify({ success: true, alertsSent, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});