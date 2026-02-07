
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Declare Deno to fix TypeScript errors in environments where Deno types are missing
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

    // 1. Fetch In-Progress Projects that have an end date
    const { data: projects, error: fetchError } = await supabaseClient
      .from('projects')
      .select('id, title, endDate, teamLeader')
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

      // Trigger alerts for Overdue or Due Today
      if (diffDays <= 0) {
        const statusLabel = diffDays < 0 ? `OVERDUE BY ${Math.abs(diffDays)} DAYS` : "DUE TODAY";

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `CostPilot System <${FROM_EMAIL}>`,
            to: [project.teamLeader.email],
            subject: `🚨 Action Required: Project ${project.title} is ${statusLabel}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #65081b;">Operational Alert</h2>
                <p>Hello <strong>${project.teamLeader.name}</strong>,</p>
                <p>The following project has reached its terminal date in the registry:</p>
                <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #d3a200; margin: 20px 0;">
                  <p style="margin:0;"><strong>Project:</strong> ${project.title}</p>
                  <p style="margin:5px 0 0 0;"><strong>Status:</strong> <span style="color: #c41034; font-weight:bold;">${statusLabel}</span></p>
                  <p style="margin:5px 0 0 0;"><strong>Deadline:</strong> ${new Date(project.endDate).toLocaleDateString()}</p>
                </div>
                <p>Please update the project status or request an extension via the dashboard.</p>
                <hr style="border:none; border-top:1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 11px; color: #888;">This is an automated system message from CostPilot EDFM.</p>
              </div>
            `,
          }),
        });

        if (res.ok) alertsSent++;
      }
    }

    return new Response(JSON.stringify({ success: true, alertsSent }), {
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
