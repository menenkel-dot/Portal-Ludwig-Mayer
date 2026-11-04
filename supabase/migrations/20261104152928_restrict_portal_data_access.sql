-- Match database access to the permissions enforced by ProtectedRoute.
-- Authorization claims must come from app_metadata, never user_metadata.
CREATE OR REPLACE FUNCTION public.portal_has_permission(required_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR COALESCE(auth.jwt() -> 'app_metadata' -> 'permissions', '[]'::jsonb) ? required_permission;
$$;

REVOKE ALL ON FUNCTION public.portal_has_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_has_permission(text) TO authenticated;

DO $$
DECLARE
  item record;
  policy record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('customers', 'customers', ARRAY['sites', 'reports', 'dashboard']),
      ('employees', 'employees', ARRAY['sites', 'time-tracking', 'reports', 'dashboard']),
      ('vehicles', 'fleet', ARRAY['dashboard']),
      ('sites', 'sites', ARRAY['time-tracking', 'reports', 'dashboard']),
      ('time_entries', 'time-tracking', ARRAY['reports', 'dashboard', 'employees', 'sites']),
      ('materials', 'sites', ARRAY[]::text[]),
      ('calculations', 'sites', ARRAY[]::text[]),
      ('calculation_items', 'sites', ARRAY[]::text[]),
      ('site_documents', 'sites', ARRAY[]::text[])
    ) AS allowed(table_name, permission_name, read_permissions)
  LOOP
    IF to_regclass(format('public.%I', item.table_name)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.table_name);
    FOR policy IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = item.table_name
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy.policyname, item.table_name);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.portal_has_permission(%L)) WITH CHECK (public.portal_has_permission(%L))',
      'portal_permission_' || item.table_name, item.table_name, item.permission_name, item.permission_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM unnest(%L::text[]) AS permission WHERE public.portal_has_permission(permission)))',
      'portal_related_read_' || item.table_name, item.table_name, item.read_permissions
    );
  END LOOP;
END $$;

-- A deleted employee must not silently erase historical time entries.
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_employee_id_fkey;
ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;
