import { serve } from "https://deno.land/std/http/server.ts";

// Declare Deno to fix TypeScript errors
declare const Deno: any;

const CLIENT_ID = Deno.env.get("SENDPULSE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("SENDPULSE_CLIENT_SECRET")!;
const WEBSITE_ID = 110625; // As provided in context/implied or needs to be env var

async function getToken() {
  const res = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const json = await res.json();
  return json.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { title, message, subscriberId, url } = await req.json();
    const token = await getToken();

    const response = await fetch(
        "https://api.sendpulse.com/push/tasks",
        {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            website_id: WEBSITE_ID,
            title,
            body: message,
            link: url,
            subscriber_ids: [subscriberId],
        }),
        }
    );

    const responseText = await response.text();
    return new Response(responseText, { 
        status: response.status,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
      });
  }
});