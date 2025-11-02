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
  // This will hold the joined customer data
  customers: { name: string } | null;
};