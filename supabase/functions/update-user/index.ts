import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdmin } from '../_shared/require-admin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    const { userId, permissions, department, role } = await req.json();
    if (!userId) throw new Error('User ID is required.');

    // Fetch current user metadata to merge, ensuring we don't overwrite existing fields unintentionally
    const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (fetchError) {
        throw fetchError;
    }

    const currentMetadata = existingUser.user.app_metadata || {};

    const newMetadata = {
        ...currentMetadata,
        permissions: permissions,
        department: department,
        role: role || currentMetadata.role || 'user', // Set role, default to existing or 'user'
    };

    const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: newMetadata
      }
    );

    if (error) {
      throw error;
    }

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
