-- 1. Customers Table
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  contact_person text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  notes text NULL,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Employees Table
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  "position" text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  hourly_rate numeric NOT NULL,
  CONSTRAINT employees_pkey PRIMARY KEY (id)
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Vehicles Table
CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  license_plate text NOT NULL,
  vehicle_type text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  status text NOT NULL DEFAULT 'Verfügbar'::text,
  location text NOT NULL,
  next_maintenance date NULL,
  notes text NULL,
  CONSTRAINT vehicles_pkey PRIMARY KEY (id)
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Sites Table
CREATE TABLE public.sites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  address text NOT NULL,
  customer_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NULL,
  status text NOT NULL DEFAULT 'Geplant'::text,
  notes text NULL,
  CONSTRAINT sites_pkey PRIMARY KEY (id),
  CONSTRAINT sites_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage sites" ON public.sites FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Time Entries Table
CREATE TABLE public.time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  employee_id uuid NOT NULL,
  site_id uuid NOT NULL,
  date date NOT NULL,
  hours_worked numeric NOT NULL,
  description text NULL,
  CONSTRAINT time_entries_pkey PRIMARY KEY (id),
  CONSTRAINT time_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT time_entries_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage time_entries" ON public.time_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Materials Table
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
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage materials" ON public.materials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Calculations Table
CREATE TABLE public.calculations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  description text NULL,
  site_id uuid NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  CONSTRAINT calculations_pkey PRIMARY KEY (id),
  CONSTRAINT calculations_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE
);
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage calculations" ON public.calculations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Calculation Items Table
CREATE TABLE public.calculation_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  calculation_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL,
  unit text NULL,
  unit_price numeric NOT NULL,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  material_id uuid NULL,
  CONSTRAINT calculation_items_pkey PRIMARY KEY (id),
  CONSTRAINT calculation_items_calculation_id_fkey FOREIGN KEY (calculation_id) REFERENCES public.calculations(id) ON DELETE CASCADE,
  CONSTRAINT calculation_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL
);
ALTER TABLE public.calculation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage calculation_items" ON public.calculation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Function and Trigger to update calculation total_amount
CREATE OR REPLACE FUNCTION public.update_calculation_total()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.calculations
    SET total_amount = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM public.calculation_items
      WHERE calculation_id = OLD.calculation_id
    )
    WHERE id = OLD.calculation_id;
    RETURN OLD;
  ELSE
    UPDATE public.calculations
    SET total_amount = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM public.calculation_items
      WHERE calculation_id = NEW.calculation_id
    )
    WHERE id = NEW.calculation_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_calculation_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.calculation_items
FOR EACH ROW EXECUTE FUNCTION public.update_calculation_total();