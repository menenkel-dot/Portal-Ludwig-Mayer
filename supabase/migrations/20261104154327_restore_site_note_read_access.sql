DROP POLICY IF EXISTS portal_related_read_site_notes ON public.site_notes;
CREATE POLICY portal_related_read_site_notes ON public.site_notes FOR SELECT TO authenticated
  USING (public.portal_has_permission('sites'));

DROP POLICY IF EXISTS portal_related_read_site_note_attachments ON public.site_note_attachments;
CREATE POLICY portal_related_read_site_note_attachments ON public.site_note_attachments FOR SELECT TO authenticated
  USING (public.portal_has_permission('sites'));

-- This trigger function is invoked by Postgres, not by clients through the Data API.
REVOKE EXECUTE ON FUNCTION public.create_notification_on_site_status_change() FROM PUBLIC, anon, authenticated;
