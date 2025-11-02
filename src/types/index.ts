export type Customer = {
  id: string;
  name: string;
  contact_person: string;
  address: string;
  phone: string;
  email: string;
  notes?: string;
  created_at: string;
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
  customers: { name: string } | null;
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
};

export type TimeEntry = {
  id: string;
  employee_id: string;
  site_id: string;
  date: string;
  hours_worked: number;
  description?: string;
  created_at: string;
  employees: { first_name: string; last_name: string } | null;
  sites: { name: string } | null;
};