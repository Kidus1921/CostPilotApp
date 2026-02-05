
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Declare Deno to fix TypeScript errors
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Only allow POST requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    // 1. Get the JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // 2. Initialize Supabase Client with the user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Get the user email from Supabase Auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized or user not found');
    }

    const userEmail = user.email;
    if (!userEmail) {
      throw new Error('User does not have an email address');
    }

    // 4. Send test email via Resend API
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured in environment');
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `FMS <no-reply@mydomain.com>`,
        to: [userEmail],
        subject: "Test Email from FMS",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>FMS System Check</h2>
            <p>Hello, this is a successful test of the Financial Management System email relay.</p>
            <p>Target recipient: <strong>${userEmail}</strong></p>
            <hr />
            <p style="font-size: 12px; color: #666;">Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true, sentTo: userEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
