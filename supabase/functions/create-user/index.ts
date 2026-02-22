
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, password, name, role, teamId, phone } = await req.json();

    // 1. Initialize Auth Identity
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (authError) throw authError;
    const newUserId = authData.user.id;

    // 2. Synchronize with Unified Registry using camelCase attributes
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
      // Cleanup orphan auth account on registry failure
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw dbError;
    }

    return new Response(JSON.stringify({ userId: newUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });

  } catch (err: any) {
    console.error("Registry Deployment Failure:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
