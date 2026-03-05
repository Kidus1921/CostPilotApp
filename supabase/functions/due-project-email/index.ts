
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
            from: `EDFM Notifications <${FROM_EMAIL}>`,
            to: [project.teamLeader.email],
            subject: `🚨 Alert: ${project.title} - ${isOverdue ? 'Overdue' : 'Due Today'}`,
            html: `
  <div style="
    --primary-color: #65081b;
    --secondary-color: #d3a200;
    --tertiary-color: #c41034;
    --highlight-color: #f9dc5c;
    --neutral-white: #ffffff;
    --neutral-black: #000000;
    --bg-main: #65081b;
    --bg-surface: #65081b;
    --bg-elevated: #c41034;
    --text-primary: #ffffff;
    --text-muted: #e5e7eb;

    background-color: #65081b;
    padding: 40px 20px;
    font-family: 'Georgia', serif;
    color: #ffffff;
  ">
    <div style="
      max-width: 600px;
      margin: 0 auto;
      background-color: #65081b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 15px 35px rgba(0,0,0,0.4);
      border: 1px solid #d3a200;
    ">
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, #65081b 0%, #c41034 100%);
        padding: 40px 20px;
        text-align: center;
        border-bottom: 2px solid #d3a200;
      ">
        <img src="https://vgubtzdnimaguwaqzlpa.supabase.co/storage/v1/object/sign/assets/ejat.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2Q0MmM3Yi04YzY0LTQzYzItYTA3OC00YzgzNDMyYzIwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvZWphdC5wbmciLCJpYXQiOjE3NzIxNzgwMzksImV4cCI6ODY1NzcyMDkxNjM5fQ.mvmh-A4EqIaAlfHVnWsPvVf34Kp96QkNKaECevPb8SU" 
             alt="EDFM Logo" 
             style="height: 70px; width: auto; margin-bottom: 20px;" />
        <h1 style="
          margin: 0;
          font-size: 24px;
          font-weight: bold;
          color: #f9dc5c;
          text-transform: uppercase;
          letter-spacing: 3px;
        ">
          OPERATIONAL ALERT
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 40px 30px; background-color: #65081b;">
        <p style="
          font-size: 18px;
          color: #ffffff;
          margin-bottom: 15px;
          font-weight: bold;
        ">
          Hello ${project.teamLeader.name},
        </p>
        <p style="
          font-size: 15px;
          color: #e5e7eb;
          line-height: 1.6;
          margin-bottom: 30px;
        ">
          Our system has detected a project in your portfolio that requires immediate attention:
        </p>

        <div style="
          background-color: #c41034;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 35px;
          border-left: 5px solid ${accentColor};
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        ">
          <p style="margin: 0; font-size: 12px; color: #f9dc5c; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Project Identifier</p>
          <p style="margin: 5px 0 20px 0; font-size: 18px; font-weight: bold; color: #ffffff;">${project.title}</p>
          
          <p style="margin: 0; font-size: 12px; color: #f9dc5c; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Terminal Status</p>
          <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: ${accentColor}; background-color: rgba(255,255,255,0.1); padding: 6px 10px; border-radius: 4px; display: inline-block;">${statusLabel}</p>
        </div>
        
        <p style="font-size: 14px; color: #e5e7eb; line-height: 1.6;">Please access the <strong>CostPilot Registry</strong> immediately to finalize this scope or request an extension from the Authority Leads.</p>

        <div style="text-align: center; margin-top: 35px;">
          <a href="${Deno.env.get('PUBLIC_APP_URL') || '#'}" style="
            display: inline-block;
            background-color: #d3a200;
            color: #000000;
            padding: 16px 35px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
          ">
            Open Registry Terminal
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="
        padding: 30px;
        background-color: rgba(0,0,0,0.2);
        text-align: center;
        border-top: 1px solid rgba(211, 162, 0, 0.2);
      ">
        <p style="
          margin: 0;
          font-size: 12px;
          color: #e5e7eb;
          letter-spacing: 0.5px;
        ">
          © 2026 EDFM Management Systems
        </p>
        <p style="
          margin: 10px 0 0 0;
          font-size: 10px;
          color: #d3a200;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.8;
        ">
          Confidential • Priority Alert • Code: ${project.id.slice(0,8).toUpperCase()}
        </p>
      </div>
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