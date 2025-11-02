export type Customer = {
  id: string;
  name: string;
  contact_person: string;
  address: string;
  phone: string;
  email: string;
  notes?: string;
  created_at: string;
  sites?: Pick<Site, 'id' | 'name' | 'status' | 'start_date'>[];
};

export type Site = {
  id: string;
  name: string;
  address: string;
  customer_id: string;
  start_date: string;
  end_date: string | null;
  status: 'Geplant' | 'In Arbeit' | 'Abgeschlossen';
  notes?: string;
  created_at: string;
  customers: { 
    id: string;
    name: string; 
    contact_person?: string;
    email?: string;
    phone?: string;
  } | null;
};

export type Vehicle = {
  id: string;
  license_plate: string;
  vehicle_type: string;
  manufacturer: string;
  model: string;
  status: 'Verfügbar' | 'Im Einsatz' | 'In Wartung';
  location: string;
  next_maintenance: string | null;
  notes?: string;
  created_at: string;
};

export type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  phone: string;
  hourly_rate: number;
  created_at: string;
  time_entries?: (TimeEntry & { sites: { id: string; name: string } | null })[];
};

export type TimeEntry = {
  id: string;
  employee_id: string;
  site_id: string;
  date: string;
  hours_worked: number;
  description?: string;
  created_at: string;
  employees: { id: string; first_name: string; last_name: string } | null;
  sites: { id: string; name: string } | null;
};

export type Calculation = {
  id: string;
  name: string;
  description?: string;
  site_id: string;
  total_amount: number;
  created_at: string;
  sites: { name: string } | null;
};

export type CalculationItem = {
  id: string;
  calculation_id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_price: number;
  created_at: string;
  material_id: string | null;
  materials: { name: string } | null;
};

export type Material = {
  id: string;
  name: string;
  unit: string;
  price_per_unit: number;
  supplier: string | null;
  notes: string | null;
  created_at: string;
};

export type SiteDocument = {
  id: string;
  site_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description: string | null;
  created_at: string;
};