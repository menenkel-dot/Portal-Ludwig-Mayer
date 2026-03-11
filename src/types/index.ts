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
  construction_manager_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'Geplant' | 'Kalkuliert' | 'Geprüft' | 'In Arbeit' | 'Abgeschlossen';
  notes?: string;
  created_at: string;
  planned_hours: number;
  customers: { 
    id: string;
    name: string; 
    contact_person?: string;
    email?: string;
    phone?: string;
  } | null;
  employees: {
      id: string;
      first_name: string;
      last_name: string;
  } | null;
};

export type Vehicle = {
  id: string;
  license_plate: string | null;
  vehicle_type: string;
  manufacturer: string;
  model: string;
  status: 'Verfügbar' | 'Im Einsatz' | 'In Wartung';
  driver: string;
  first_registration: string | null;
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
  employee_assignments?: EmployeeAssignment[];
};

export type TimeEntry = {
  id: string;
  employee_id: string;
  site_id: string | null;
  date: string;
  hours_worked: number;
  hourly_rate: number; // Snapshot des Lohns zum Zeitpunkt der Erfassung
  description?: string;
  created_at: string;
  entry_type: 'Arbeit' | 'Urlaub' | 'Schlechtwetter' | 'Krank' | 'Feiertag' | 'Unbezahlter Urlaub' | 'Krank Unfall' | 'Krank Krankenkasse' | 'Fehlt entschuldigt' | 'Fehlt unentschuldigt' | 'Freier Tag' | 'Kurzarbeitergeld';
  employees: { id: string; first_name: string; last_name: string } | null;
  sites: { id: string; name: string } | null;
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

export type AppUser = {
  id: string;
  email: string;
  app_metadata: {
    permissions: string[];
    role: 'admin' | 'user';
    department?: string;
  };
  created_at: string;
};

export type SiteNoteAttachment = {
  id: string;
  note_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
};

export type SiteNote = {
  id: string;
  site_id: string;
  user_id: string | null;
  user_email: string | null;
  content: string | null;
  created_at: string;
  site_note_attachments: SiteNoteAttachment[];
};

export type EmployeeAssignment = {
  id: string;
  employee_id: string;
  site_id: string | null;
  activity: string | null;
  week_start_date: string;
  team_number: number | null;
  created_at: string;
  employees?: Pick<Employee, 'id' | 'first_name' | 'last_name'>;
  sites?: Pick<Site, 'id' | 'name'>;
};

export type WeatherConditions = {
  sun?: boolean;
  rain?: boolean;
  frost?: boolean;
  wind?: boolean;
  snow?: boolean;
  temperature?: number | null;
};

export type WorkerCountDetail = {
  count?: number | null;
  hours?: number | null;
};

export type WorkerCounts = {
  [workerType: string]: WorkerCountDetail | null;
};

export type DailyConstructionReport = {
  id: string;
  site_id: string;
  report_date: string;
  weather_conditions: WeatherConditions | null;
  worker_counts: WorkerCounts | null;
  work_results: string | null;
  obstacles: string | null;
  scope_changes: string | null;
  special_incidents: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RegieReportEmployeeHour = {
  employee_id: string;
  hours: {
    mon: number | null;
    tue: number | null;
    wed: number | null;
    thu: number | null;
    fri: number | null;
  };
};

export type RegieReportWorkDescription = {
  id: string;
  description: string;
};

export type RegieReportMaterial = {
  id: string;
  quantity: number | null;
  unit: string;
  description: string;
  unit_price: number | null;
};

export type RegieReport = {
  id: string;
  site_id: string;
  week_number: number;
  year: number;
  status: string;
  employee_hours: RegieReportEmployeeHour[] | null;
  work_descriptions: RegieReportWorkDescription[] | null;
  materials: RegieReportMaterial[] | null;
  created_at: string;
  updated_at: string;
};