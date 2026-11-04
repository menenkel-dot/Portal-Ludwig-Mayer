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
      ('materials', 'materials', ARRAY['sites', 'calculations']),
      ('calculations', 'calculations', ARRAY['sites']),
      ('calculation_items', 'calculations', ARRAY['sites']),
      ('site_documents', 'sites', ARRAY[]::text[]),
      ('site_notes', 'sites', ARRAY[]::text[]),
      ('site_note_attachments', 'sites', ARRAY[]::text[]),
      ('employee_assignments', 'employees', ARRAY['sites']),
      ('daily_construction_reports', 'sites', ARRAY['reports']),
      ('regie_reports', 'sites', ARRAY['reports'])
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

-- Keep note deletion tied to its author, including attached files.
DROP POLICY portal_permission_site_notes ON public.site_notes;
CREATE POLICY portal_write_site_notes ON public.site_notes FOR INSERT TO authenticated
  WITH CHECK (public.portal_has_permission('sites') AND user_id = (SELECT auth.uid()));
CREATE POLICY portal_delete_site_notes ON public.site_notes FOR DELETE TO authenticated
  USING (public.portal_has_permission('sites') AND (user_id = (SELECT auth.uid()) OR public.portal_has_permission('users')));

DROP POLICY portal_permission_site_note_attachments ON public.site_note_attachments;
CREATE POLICY portal_insert_site_note_attachments ON public.site_note_attachments FOR INSERT TO authenticated
  WITH CHECK (public.portal_has_permission('sites') AND EXISTS (
    SELECT 1 FROM public.site_notes n WHERE n.id = note_id AND n.user_id = (SELECT auth.uid())
  ));
CREATE POLICY portal_delete_site_note_attachments ON public.site_note_attachments FOR DELETE TO authenticated
  USING (public.portal_has_permission('sites') AND EXISTS (
    SELECT 1 FROM public.site_notes n WHERE n.id = note_id
      AND (n.user_id = (SELECT auth.uid()) OR public.portal_has_permission('users'))
  ));

-- A deleted employee must not silently erase historical time entries.
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_employee_id_fkey;
ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

-- Storage access follows the same site permission as document metadata.
DROP POLICY IF EXISTS "Allow authenticated users to view site documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload site documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete site documents" ON storage.objects;
CREATE POLICY "portal_read_site_documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'site_documents' AND public.portal_has_permission('sites'));
CREATE POLICY "portal_upload_site_documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site_documents' AND public.portal_has_permission('sites'));
CREATE POLICY "portal_delete_site_documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site_documents' AND public.portal_has_permission('sites'));
