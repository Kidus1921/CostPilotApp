// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions
// 1. supabase functions new check_deadlines
// 2. Paste this code into index.ts
// 3. supabase functions deploy check_deadlines
// 4. Set up a Cron trigger in Supabase Dashboard to run this function every 12 hours.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Declare Deno to fix TypeScript errors in environments where Deno types are missing
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("Running deadline checks...")

    const { data: projects, error } = await supabaseClient
      .from('projects')
      .select('*, teamLeader:users!teamLeader(id, email, name)')
      .neq('status', 'Completed')
      .neq('status', 'Rejected')

    if (error) throw error

    const now = new Date()
    let notificationsSent = 0
    
    const projectsList = projects || [];

    for (const project of projectsList) {
        if (!project.endDate) continue
        
        const endDate = new Date(project.endDate)
        const diffTime = endDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        let title = ''
        let message = ''
        let priority = 'Medium'

        if (diffDays < 0) {
            title = '🚨 Project Overdue'
            message = `Project "${project.title}" is overdue.`
            priority = 'Critical'
        } else if (diffDays === 0) {
            title = '⏰ Project Due Today'
            message = `Project "${project.title}" is due today.`
            priority = 'High'
        } else if (diffDays <= 3 && diffDays > 0) {
            title = '⏳ Upcoming Deadline'
            message = `Project "${project.title}" due in ${diffDays} days.`
            priority = 'High'
        }

        if (title && project.teamLeader?.id) {
            // 1. Insert into Notifications Table
            await supabaseClient.from('notifications').insert({
                userId: project.teamLeader.id,
                title,
                message,
                type: 'Deadline',
                priority,
                isRead: false,
                timestamp: new Date().toISOString()
            })

            // 2. Send Push Notification via SendPulse API
            // Note: You need to set SENDPULSE_ID and SENDPULSE_SECRET in Supabase Secrets
            const spId = Deno.env.get('SENDPULSE_ID')
            const spSecret = Deno.env.get('SENDPULSE_SECRET')
            
            if (spId && spSecret) {
                // Logic to authenticate and send to SendPulse would go here
                // This usually requires getting a token first, then POSTing to /push/tasks
                console.log(`[SendPulse] Would send push to user ${project.teamLeader.id}`)
            }
            
            notificationsSent++
        }
    }

    return new Response(
      JSON.stringify({ success: true, notificationsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})