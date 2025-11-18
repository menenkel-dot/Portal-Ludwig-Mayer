import { supabase } from '@/lib/supabase';
import { Site } from '@/types';

export type NewSite = Omit<Site, 'id' | 'created_at' | 'customers' | 'employees'>;

export const getSites = async (): Promise<Site[]> => {
  const { data, error } = await supabase
    .from('sites')
    .select('*, customers(id, name), employees(id, first_name, last_name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sites:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const getSiteById = async (id: string): Promise<Site | null> => {
  const { data, error } = await supabase
    .from('sites')
    .select('*, customers(*), employees(id, first_name, last_name)') // Fetch all customer data
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching site by id:', error);
    throw new Error(error.message);
  }
  return data;
};


export const createSite = async (siteData: NewSite) => {
  const { data, error } = await supabase
    .from('sites')
    .insert([siteData])
    .select()
    .single();

  if (error) {
    console.error('Error creating site:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateSite = async (id: string, siteData: Partial<NewSite>) => {
  const { data, error } = await supabase
    .from('sites')
    .update(siteData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating site:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteSite = async (id: string) => {
  const { error } = await supabase.from('sites').delete().eq('id', id);

  if (error) {
    console.error('Error deleting site:', error);
    throw new Error(error.message);
  }
  return true;
};