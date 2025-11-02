-- Create the materials table
CREATE TABLE public.materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  unit text NOT NULL,
  price_per_unit numeric NOT NULL DEFAULT 0,
  supplier text NULL,
  notes text NULL,
  CONSTRAINT materials_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Create policies to allow authenticated users to manage materials
CREATE POLICY "Allow authenticated users to view materials" ON public.materials
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert materials" ON public.materials
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update materials" ON public.materials
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete materials" ON public.materials
FOR DELETE TO authenticated
USING (true);