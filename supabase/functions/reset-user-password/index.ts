import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdmin } from '../_shared/require-admin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Diese Funktion setzt das Passwort eines Benutzers zurück.
// Sie muss mit dem Service Role Key aufgerufen werden.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const denied = await requireAdmin(req, supabaseAdmin);
    if (denied) return new Response(denied.body, { status: denied.status, headers: corsHeaders });

    const { userId, newPassword } = await req.json();
    if (!userId || !newPassword) throw new Error('User ID and new password are required.');

    const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("[reset-user-password] Error updating password:", error);
      throw error;
    }
    
    console.log(`[reset-user-password] Password successfully reset for user: ${userId}`);

    return new Response(JSON.stringify({ user }), {
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
