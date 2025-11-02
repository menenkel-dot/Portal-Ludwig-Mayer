-- 1. Create Storage Bucket for Site Documents
-- This script assumes a public bucket named 'site_documents' has been created in the Supabase UI.
INSERT INTO storage.buckets (id, name, public)
VALUES ('site_documents', 'site_documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Site Documents Table
CREATE TABLE public.site_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  site_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  description text NULL,
  CONSTRAINT site_documents_pkey PRIMARY KEY (id),
  CONSTRAINT site_documents_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE
);

-- 3. Enable RLS and define policies for the table
ALTER TABLE public.site_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view documents"
ON public.site_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert documents"
ON public.site_documents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete documents"
ON public.site_documents FOR DELETE
TO authenticated
USING (true);

-- 4. Define policies for the storage bucket
CREATE POLICY "Allow authenticated users to view site documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'site_documents');

CREATE POLICY "Allow authenticated users to upload site documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site_documents');

CREATE POLICY "Allow authenticated users to delete site documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site_documents');