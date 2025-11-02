import { supabase } from '@/lib/supabase';
import { Customer } from '@/types';

// Typ für das Erstellen eines neuen Kunden (ohne von DB generierte Felder)
export type NewCustomer = Omit<Customer, 'id' | 'created_at' | 'sites'>;

export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching customers:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const getCustomerById = async (id: string): Promise<Customer | null> => {
    const { data, error } = await supabase
    .from('customers')
    .select('*, sites(id, name, status, start_date)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching customer by id:', error);
    throw new Error(error.message);
  }
  return data;
}

export const createCustomer = async (customerData: NewCustomer) => {
  const { data, error } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateCustomer = async (id: string, customerData: Partial<NewCustomer>) => {
  const { data, error } = await supabase
    .from('customers')
    .update(customerData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteCustomer = async (id: string) => {
  const { error } = await supabase.from('customers').delete().eq('id', id);

  if (error) {
    console.error('Error deleting customer:', error);
    throw new Error(error.message);
  }
  return true;
};