ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
