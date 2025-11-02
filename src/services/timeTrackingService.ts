import { supabase } from '@/lib/supabase';
import { TimeEntry } from '@/types';

export type NewTimeEntry = Omit<TimeEntry, 'id' | 'created_at' | 'employees' | 'sites'>;

export const getTimeEntries = async (): Promise<TimeEntry[]> => {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, employees(first_name, last_name), sites(name)')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching time entries:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const createTimeEntry = async (entryData: NewTimeEntry) => {
  const { data, error } = await supabase
    .from('time_entries')
    .insert([entryData])
    .select()
    .single();

  if (error) {
    console.error('Error creating time entry:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateTimeEntry = async (id: string, entryData: Partial<NewTimeEntry>) => {
  const { data, error } = await supabase
    .from('time_entries')
    .update(entryData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating time entry:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteTimeEntry = async (id: string) => {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);

  if (error) {
    console.error('Error deleting time entry:', error);
    throw new Error(error.message);
  }
  return true;
};