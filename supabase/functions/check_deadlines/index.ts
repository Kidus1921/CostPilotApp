
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Declare Deno to fix TypeScript errors in non-Deno environments
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

    console.log("[Deadline Checker] Initiating scan...");

    const { data: projects, error } = await supabaseClient
      .from('projects')
      .select('*, teamLeader')
      .neq('status', 'Completed')
      .neq('status', 'Rejected')

    if (error) throw error

    const now = new Date()
    now.setHours(0,0,0,0)
    
    let notificationsCreated = 0
    const notificationsToInsert = []

    for (const project of (projects || [])) {
        if (!project.endDate || !project.teamLeader?.id) continue
        
        const endDate = new Date(project.endDate)
        const diffTime = endDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        let title = ''
        let message = ''
        let priority = 'Medium'

        if (diffDays < 0) {
            title = '🚨 Project Overdue'
            message = `Critical: Project "${project.title}" has exceeded its terminal date.`
            priority = 'Critical'
        } else if (diffDays === 0) {
            title = '⏰ Due Today'
            message = `Attention: Project "${project.title}" is scheduled for closure today.`
            priority = 'High'
        } else if (diffDays <= 3 && diffDays > 0) {
            title = '⏳ Approaching Deadline'
            message = `Notice: Project "${project.title}" is due in ${diffDays} days.`
            priority = 'High'
        }

        if (title) {
            notificationsToInsert.push({
                userId: project.teamLeader.id,
                title,
                message,
                type: 'Deadline',
                priority,
                isRead: false,
                link: `/projects/${project.id}`,
                timestamp: new Date().toISOString()
            })
            notificationsCreated++
        }
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('notifications')
        .insert(notificationsToInsert)
      
      if (insertError) console.error("[Deadline Checker] Batch insert failed:", insertError)
    }

    return new Response(
      JSON.stringify({ success: true, notificationsCreated, scanned: projects?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})