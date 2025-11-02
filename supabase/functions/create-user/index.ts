import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Diese Funktion kann nur von einem authentifizierten Admin aufgerufen werden.
// Sie erstellt einen neuen Benutzer in Supabase Auth mit den übergebenen Berechtigungen.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, permissions } = await req.json();

    // Erstellt einen Admin-Client, um Benutzer anzulegen
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Erstellt den neuen Benutzer
    const { data: userData, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Benutzer muss E-Mail nicht bestätigen
      app_metadata: {
        permissions: permissions,
        role: 'user' // Standardrolle
      },
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ user: userData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});