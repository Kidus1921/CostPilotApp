
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@3.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userEmail, userId, projects } = await req.json();

    if (!userEmail || !projects || !Array.isArray(projects)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Build HTML Body
    const projectRows = projects.map(p => {
      const dueDate = new Date(p.dueDate || p.endDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let statusText = "";
      let statusColor = "";
      
      if (diffDays < 0) {
        statusText = `OVERDUE BY ${Math.abs(diffDays)} DAYS`;
        statusColor = "#ff4d4d"; // Bright red for overdue
      } else if (diffDays === 0) {
        statusText = "DUE TODAY";
        statusColor = "#f9dc5c"; // Light gold
      } else {
        statusText = `${diffDays} DAYS LEFT`;
        statusColor = "#d3a200"; // Gold
      }

      return `
        <div style="background-color: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid ${statusColor};">
          <div style="margin-bottom: 8px;">
            <strong style="font-size: 16px; color: #ffffff;">${p.title}</strong>
          </div>
          <div style="display: table; width: 100%; font-size: 13px;">
            <div style="display: table-cell; color: #e5e7eb;">
              Target Date: <strong>${p.dueDate || p.endDate}</strong>
            </div>
            <div style="display: table-cell; text-align: right;">
              <span style="font-size: 11px; font-weight: bold; color: ${statusColor}; background-color: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; letter-spacing: 0.5px;">
                ${statusText}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    const htmlContent = `
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
          Projects Near Deadline
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
          Attention Required
        </p>
        <p style="
          font-size: 15px;
          color: #e5e7eb;
          line-height: 1.6;
          margin-bottom: 30px;
        ">
          The following projects are reaching their critical completion dates. Please review the status of each item to ensure project integrity and timely delivery.
        </p>

        <div style="
          background-color: #c41034;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 35px;
          border-left: 5px solid #d3a200;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        ">
          <h3 style="
            margin: 0 0 15px 0;
            font-size: 16px;
            color: #f9dc5c;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            border-bottom: 1px solid rgba(249, 220, 92, 0.3);
            padding-bottom: 8px;
          ">
            Upcoming Deadlines
          </h3>
          <div style="color: #ffffff; font-size: 15px; line-height: 1.8;">
            ${projectRows}
          </div>
        </div>

        <div style="text-align: center;">
          <a href="#" style="
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
            Review Projects
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
          Confidential • Priority Alert
        </p>
      </div>
    </div>
  </div>
`;

    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    const { data, error } = await resend.emails.send({
      from: `EDFM Notifications <${FROM_EMAIL}>`,
      to: userEmail,
      subject: "EDFM: Projects Near Deadline",
      html: htmlContent,
    });

    // Log the attempt
    await supabaseAdmin.from("email_logs").insert([
      {
        user_id: userId || null,
        email_type: "deadline_digest",
        status: error ? "failed" : "sent",
        sent_at: new Date().toISOString(),
      }
    ]);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Email Dispatch Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
