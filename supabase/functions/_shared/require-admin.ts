import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function requireAdmin(req: Request, client: SupabaseClient): Promise<Response | null> {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization') ?? '');
  if (!match) return new Response('Unauthorized', { status: 401 });

  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data.user) return new Response('Unauthorized', { status: 401 });
  if (data.user.app_metadata?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  return null;
}
