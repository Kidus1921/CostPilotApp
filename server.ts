import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.warn("Warning: RESEND_API_KEY is not defined. Email notifications will fail.");
}
const resend = new Resend(resendApiKey);

// Initialize Supabase Admin (using service role key for cron jobs)
const rawSupabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const fixSupabaseUrl = (u: string | undefined) => {
  if (!u) return u;
  if (u.includes('supabase.com/dashboard/project/')) {
    const parts = u.split('/');
    const ref = parts[parts.length - 1].split('?')[0];
    if (ref && ref.length >= 20) {
      return `https://${ref}.supabase.co`;
    }
  }
  return u;
};

const supabaseUrl = fixSupabaseUrl(rawSupabaseUrl);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Supabase environment variables are missing.");
}

const supabaseAdmin = createClient(
  supabaseUrl || "",
  supabaseServiceKey || ""
);

app.use(express.json());

/**
 * Core Logic for processing deadline notifications
 */
async function processDeadlineNotifications() {
  console.log("Cron: Starting refined deadline notification check...");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Cron: Aborting - Supabase environment variables are missing.");
    return { success: false, error: "Supabase config missing" };
  }

  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const dateString = threeDaysFromNow.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch projects near deadline
    const { data: projects, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("*")
      .lte("endDate", dateString)
      .gte("endDate", today)
      .eq("notification_sent", false);

    if (projectError) {
      console.error("Cron: Project fetch error:", JSON.stringify(projectError, null, 2));
      throw new Error(`Database error fetching projects: ${projectError.message}`);
    }

    if (!projects || projects.length === 0) {
      console.log("Cron: No projects found requiring notification.");
      return { message: "No notifications needed." };
    }

    // 2. Fetch all Admins for the summary report
    const { data: admins, error: adminError } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("role", "Admin");

    if (adminError) {
      console.error("Cron: Failed to fetch admins:", JSON.stringify(adminError, null, 2));
    }
    const adminEmails = admins?.map(a => a.email).filter(Boolean) as string[] || [];

    console.log(`Cron: Processing ${projects.length} projects. Notifying ${adminEmails.length} admins.`);

    if (!resendApiKey) {
      console.warn("Cron: RESEND_API_KEY is missing. Skipping email dispatch.");
      return { success: false, error: "RESEND_API_KEY missing", projectsFound: projects.length };
    }

    const results = [];

    // 3. Process each project for Leaders and PMs
    for (const project of projects) {
      const recipients = new Set<string>();
      
      // Add Team Leader
      if (project.teamLeader?.email) {
        recipients.add(project.teamLeader.email);
      }

      // Add Project Managers from the team array
      if (Array.isArray(project.team)) {
        project.team.forEach((member: any) => {
          if (member.role === "Project Manager" && member.email) {
            recipients.add(member.email);
          }
        });
      }

      // Add legacy assigned_email if present
      if (project.assigned_email) {
        recipients.add(project.assigned_email);
      }

      const recipientList = Array.from(recipients);

      if (recipientList.length > 0) {
        try {
          const dueDate = new Date(project.endDate);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const diffTime = dueDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let statusText = "";
          let statusColor = "";
          if (diffDays < 0) {
            statusText = `OVERDUE BY ${Math.abs(diffDays)} DAYS`;
            statusColor = "#ff4d4d";
          } else if (diffDays === 0) {
            statusText = "DUE TODAY";
            statusColor = "#f9dc5c";
          } else {
            statusText = `${diffDays} DAYS LEFT`;
            statusColor = "#d3a200";
          }

          await resend.emails.send({
            from: "EDFM Notifications <notifications@resend.dev>",
            to: recipientList,
            subject: `⚠ Deadline Approaching: ${project.title}`,
            html: `
              <div style="background-color: #65081b; padding: 40px 20px; font-family: 'Georgia', serif; color: #ffffff;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #65081b; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.4); border: 1px solid #d3a200;">
                  <div style="background: linear-gradient(135deg, #65081b 0%, #c41034 100%); padding: 30px; text-align: center; border-bottom: 2px solid #d3a200;">
                    <img src="https://vgubtzdnimaguwaqzlpa.supabase.co/storage/v1/object/sign/assets/ejat.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2Q0MmM3Yi04YzY0LTQzYzItYTA3OC00YzgzNDMyYzIwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvZWphdC5wbmciLCJpYXQiOjE3NzIxNzgwMzksImV4cCI6ODY1NzcyMDkxNjM5fQ.mvmh-A4EqIaAlfHVnWsPvVf34Kp96QkNKaECevPb8SU" alt="Logo" style="height: 60px; margin-bottom: 15px;" />
                    <h2 style="color: #f9dc5c; margin: 0; font-size: 20px; letter-spacing: 2px; text-transform: uppercase;">Deadline Warning</h2>
                  </div>
                  <div style="padding: 30px;">
                    <p style="font-size: 16px; color: #ffffff; margin-bottom: 20px;">Hello,</p>
                    <p style="font-size: 14px; color: #e5e7eb; line-height: 1.6;">You are receiving this because you are the <strong>Leader</strong> or an <strong>Assigned Manager</strong> for this project.</p>
                    
                    <div style="background-color: rgba(0,0,0,0.2); border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 5px solid ${statusColor};">
                      <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #ffffff;">${project.title}</p>
                      <p style="margin: 0; font-size: 14px; color: #e5e7eb;">Deadline: <strong>${new Date(project.endDate).toLocaleDateString()}</strong></p>
                      <p style="margin: 10px 0 0 0; font-size: 13px; font-weight: bold; color: ${statusColor}; text-transform: uppercase; letter-spacing: 1px;">${statusText}</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="${process.env.PUBLIC_APP_URL || '#'}" style="display: inline-block; background-color: #d3a200; color: #000000; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase;">Open Registry</a>
                    </div>
                  </div>
                  <div style="padding: 20px; background-color: rgba(0,0,0,0.2); text-align: center; border-top: 1px solid rgba(211, 162, 0, 0.2);">
                    <p style="margin: 0; font-size: 11px; color: #e5e7eb;">© 2026 EDFM Management Systems</p>
                  </div>
                </div>
              </div>
            `,
          });
          results.push({ id: project.id, type: 'individual', success: true });
        } catch (err: any) {
          console.error(`Cron: Failed individual email for ${project.id}:`, err);
          results.push({ id: project.id, type: 'individual', success: false, error: err.message });
        }
      }
    }

    // 4. Send Summary Report to Admins
    if (adminEmails.length > 0) {
      try {
        const projectListHtml = projects.map(p => `
          <li style="background-color: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 3px solid #d3a200;">
            <strong style="color: #ffffff; font-size: 15px;">${p.title}</strong>
            <div style="font-size: 12px; color: #e5e7eb; margin-top: 4px;">
              Deadline: ${new Date(p.endDate).toLocaleDateString()} | Leader: ${p.teamLeader?.name || 'Unassigned'}
            </div>
          </li>
        `).join('');

        await resend.emails.send({
          from: "EDFM Admin Reports <reports@resend.dev>",
          to: adminEmails,
          subject: "⚠ Admin Summary: Projects Near Deadline",
          html: `
            <div style="background-color: #65081b; padding: 40px 20px; font-family: 'Georgia', serif; color: #ffffff;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #65081b; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.4); border: 1px solid #d3a200;">
                <div style="background: linear-gradient(135deg, #65081b 0%, #c41034 100%); padding: 30px; text-align: center; border-bottom: 2px solid #d3a200;">
                  <img src="https://vgubtzdnimaguwaqzlpa.supabase.co/storage/v1/object/sign/assets/ejat.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2Q0MmM3Yi04YzY0LTQzYzItYTA3OC00YzgzNDMyYzIwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvZWphdC5wbmciLCJpYXQiOjE3NzIxNzgwMzksImV4cCI6ODY1NzcyMDkxNjM5fQ.mvmh-A4EqIaAlfHVnWsPvVf34Kp96QkNKaECevPb8SU" alt="Logo" style="height: 60px; margin-bottom: 15px;" />
                  <h2 style="color: #f9dc5c; margin: 0; font-size: 20px; letter-spacing: 2px; text-transform: uppercase;">Daily Admin Summary</h2>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px; color: #ffffff; margin-bottom: 20px;">Administrator Notice,</p>
                  <p style="font-size: 14px; color: #e5e7eb; line-height: 1.6;">The following projects are within 3 days of their deadline and require executive oversight:</p>
                  
                  <div style="margin: 25px 0;">
                    <ul style="padding: 0; list-style: none;">
                      ${projectListHtml}
                    </ul>
                  </div>
                  
                  <p style="font-size: 14px; color: #e5e7eb; text-align: center; margin-top: 20px;">Please check the dashboard for full operational details.</p>
                </div>
                <div style="padding: 20px; background-color: rgba(0,0,0,0.2); text-align: center; border-top: 1px solid rgba(211, 162, 0, 0.2);">
                  <p style="margin: 0; font-size: 11px; color: #e5e7eb;">© 2026 EDFM Management Systems</p>
                </div>
              </div>
            </div>
          `,
        });
        results.push({ type: 'admin_summary', success: true });
      } catch (err: any) {
        console.error("Cron: Failed admin summary email:", err);
        results.push({ type: 'admin_summary', success: false, error: err.message });
      }
    }

    // 5. Mark projects as notified
    const projectIds = projects.map(p => p.id);
    const { error: updateError } = await supabaseAdmin
      .from("projects")
      .update({ notification_sent: true })
      .in("id", projectIds);

    if (updateError) {
      console.error("Cron: Failed to update notification status:", updateError);
    }

    return { 
      success: true,
      projectsProcessed: projects.length,
      adminsNotified: adminEmails.length,
      results 
    };
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    const errorStack = err instanceof Error ? err.stack : '';
    console.error("Cron: Global error:", errorMessage, errorStack);
    throw err;
  }
}

/**
 * Core Logic for processing deadline digest notifications
 * Queries projects due in <= 2 days, groups by user, and sends a digest.
 */
async function processDeadlineDigest() {
  console.log("Cron: Starting deadline digest check...");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Cron: Aborting digest - Supabase environment variables are missing.");
    return { success: false, error: "Supabase config missing" };
  }

  try {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const dateString = twoDaysFromNow.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch projects near deadline (due in <= 2 days and not completed)
    const { data: projects, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("*")
      .lte("endDate", dateString)
      .gte("endDate", today)
      .neq("status", "Completed");

    if (projectError) {
      console.error("Cron: Digest project fetch error:", projectError);
      throw projectError;
    }

    if (!projects || projects.length === 0) {
      console.log("Cron: No projects found for digest.");
      return { message: "No digest needed." };
    }

    // 2. Group projects by user email
    // We'll check assigned_email, teamLeader.email, and team members
    const userDigests: Record<string, { email: string, userId?: string, projects: any[] }> = {};

    projects.forEach(project => {
      const recipients = new Set<string>();
      if (project.assigned_email) recipients.add(project.assigned_email);
      if (project.teamLeader?.email) recipients.add(project.teamLeader.email);
      
      if (Array.isArray(project.team)) {
        project.team.forEach((m: any) => {
          if (m.email) recipients.add(m.email);
        });
      }

      recipients.forEach(email => {
        if (!userDigests[email]) {
          userDigests[email] = { email, projects: [] };
        }
        userDigests[email].projects.push({
          title: project.title,
          dueDate: new Date(project.endDate).toLocaleDateString(),
          rawDate: project.endDate
        });
      });
    });

    // 3. Send digest for each user
    const results = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const email of Object.keys(userDigests)) {
      const digest = userDigests[email];
      try {
        const projectRows = digest.projects.map(p => {
          const dueDate = new Date(p.rawDate);
          const diffTime = dueDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let statusText = "";
          let statusColor = "";
          if (diffDays < 0) {
            statusText = `OVERDUE BY ${Math.abs(diffDays)} DAYS`;
            statusColor = "#ff4d4d";
          } else if (diffDays === 0) {
            statusText = "DUE TODAY";
            statusColor = "#f9dc5c";
          } else {
            statusText = `${diffDays} DAYS LEFT`;
            statusColor = "#d3a200";
          }

          return `
            <div style="background-color: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid ${statusColor};">
              <div style="margin-bottom: 8px;">
                <strong style="font-size: 16px; color: #ffffff;">${p.title}</strong>
              </div>
              <div style="display: table; width: 100%; font-size: 13px;">
                <div style="display: table-cell; color: #e5e7eb;">
                  Target Date: <strong>${p.dueDate}</strong>
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
          <div style="background-color: #65081b; padding: 40px 20px; font-family: 'Georgia', serif; color: #ffffff;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #65081b; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.4); border: 1px solid #d3a200;">
              <div style="background: linear-gradient(135deg, #65081b 0%, #c41034 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #d3a200;">
                <img src="https://vgubtzdnimaguwaqzlpa.supabase.co/storage/v1/object/sign/assets/ejat.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2Q0MmM3Yi04YzY0LTQzYzItYTA3OC00YzgzNDMyYzIwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvZWphdC5wbmciLCJpYXQiOjE3NzIxNzgwMzksImV4cCI6ODY1NzcyMDkxNjM5fQ.mvmh-A4EqIaAlfHVnWsPvVf34Kp96QkNKaECevPb8SU" alt="Logo" style="height: 70px; margin-bottom: 20px;" />
                <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #f9dc5c; text-transform: uppercase; letter-spacing: 3px;">Projects Near Deadline</h1>
              </div>
              <div style="padding: 40px 30px; background-color: #65081b;">
                <p style="font-size: 18px; color: #ffffff; margin-bottom: 15px; font-weight: bold;">Attention Required</p>
                <p style="font-size: 15px; color: #e5e7eb; line-height: 1.6; margin-bottom: 30px;">The following projects are reaching their critical completion dates. Please review the status of each item to ensure project integrity and timely delivery.</p>
                
                <div style="background-color: #c41034; border-radius: 12px; padding: 25px; margin-bottom: 35px; border-left: 5px solid #d3a200; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                  <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #f9dc5c; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid rgba(249, 220, 92, 0.3); padding-bottom: 8px;">Upcoming Deadlines</h3>
                  <div style="color: #ffffff; font-size: 15px; line-height: 1.8;">
                    ${projectRows}
                  </div>
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.PUBLIC_APP_URL || '#'}" style="display: inline-block; background-color: #d3a200; color: #000000; padding: 16px 35px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">Review Projects</a>
                </div>
              </div>
              <div style="padding: 30px; background-color: rgba(0,0,0,0.2); text-align: center; border-top: 1px solid rgba(211, 162, 0, 0.2);">
                <p style="margin: 0; font-size: 12px; color: #e5e7eb; letter-spacing: 0.5px;">© 2026 EDFM Management Systems</p>
              </div>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: "EDFM Notifications <notifications@resend.dev>",
          to: email,
          subject: "EDFM: Projects Near Deadline",
          html: htmlContent,
        });

        // Log to email_logs
        await supabaseAdmin.from("email_logs").insert([
          {
            user_id: null, // We'd need to fetch user ID by email to be precise
            email_type: "deadline_digest",
            status: "sent",
            sent_at: new Date().toISOString()
          }
        ]);

        results.push({ email, success: true });
      } catch (err: any) {
        console.error(`Cron: Failed digest for ${email}:`, err);
        results.push({ email, success: false, error: err.message });
      }
    }

    return { success: true, processed: results.length, results };
  } catch (err: any) {
    console.error("Cron: Digest global error:", err);
    throw err;
  }
}

// API Route for manual trigger
app.post("/api/cron/send-deadline-notifications", async (req, res) => {
  try {
    const result = await processDeadlineNotifications();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API Route for manual trigger
app.post("/api/cron/send-deadline-digest", async (req, res) => {
  try {
    const result = await processDeadlineDigest();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * User Management Endpoints
 */

// Create User (Auth + DB)
app.post("/api/users/create", async (req, res) => {
  try {
    const { email, password, name, role, teamId, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields: email, password, name" });
    }

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (authError) throw authError;
    const newUserId = authData.user.id;

    // 2. Insert into users table
    const { error: dbError } = await supabaseAdmin.from("users").insert([
      {
        id: newUserId,
        email,
        name,
        role: role || "Project Manager",
        status: "Active",
        teamId: teamId || null,
        phone: phone || null,
        notificationPreferences: {},
        privileges: [],
        created_at: new Date().toISOString(),
      },
    ]);

    if (dbError) {
      // Cleanup auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw dbError;
    }

    res.status(201).json({ userId: newUserId });
  } catch (err: any) {
    console.error("User Creation Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Sync Auth Users to DB
app.post("/api/users/sync", async (req, res) => {
  try {
    console.log("Sync: Starting Auth to DB synchronization...");
    
    // 1. Fetch all users from Auth
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // 2. Fetch all users from DB
    const { data: dbUsers, error: dbError } = await supabaseAdmin.from("users").select("id");
    if (dbError) throw dbError;

    const dbUserIds = new Set(dbUsers.map(u => u.id));
    const toInsert = [];

    for (const authUser of authUsers) {
      if (!dbUserIds.has(authUser.id)) {
        toInsert.push({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Unknown User',
          role: authUser.user_metadata?.role || "Project Manager",
          status: "Active",
          created_at: authUser.created_at,
        });
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("users").insert(toInsert);
      if (insertError) throw insertError;
    }

    res.json({ success: true, syncedCount: toInsert.length });
  } catch (err: any) {
    console.error("User Sync Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Schedule the digest to run every day at 8 AM
cron.schedule("0 8 * * *", () => {
  console.log("Cron: Running scheduled daily digest job...");
  processDeadlineDigest().catch(err => console.error("Cron: Digest job failed:", err));
});

// Schedule the task to run every day at midnight
cron.schedule("0 0 * * *", () => {
  console.log("Cron: Running scheduled daily notification job...");
  processDeadlineNotifications().catch(err => {
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Cron: Scheduled job failed:", errorMessage);
  });
});

// For testing/demo purposes: run every hour
cron.schedule("0 * * * *", () => {
  console.log("Cron: Running hourly check (demo mode)...");
  processDeadlineNotifications().catch(err => {
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Cron: Hourly job failed:", errorMessage);
  });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
