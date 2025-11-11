import { supabase } from '@/lib/supabase';
import { TimeEntry } from '@/types';
import { startOfWeek, endOfWeek, formatISO } from 'date-fns';

export type NewTimeEntry = Omit<TimeEntry, 'id' | 'created_at' | 'employees' | 'sites'>;

export const getTimeEntries = async (): Promise<TimeEntry[]> => {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, employees(id, first_name, last_name), sites(id, name)')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching time entries:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const getTimeEntriesForSite = async (siteId: string): Promise<TimeEntry[]> => {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, employees(id, first_name, last_name)')
    .eq('site_id', siteId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching time entries for site:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const getTimeEntriesForSiteAndWeek = async (siteId: string, weekStartDate: Date): Promise<TimeEntry[]> => {
  const start = startOfWeek(weekStartDate, { weekStartsOn: 1 });
  const end = endOfWeek(weekStartDate, { weekStartsOn: 1 });

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('site_id', siteId)
    .gte('date', formatISO(start, { representation: 'date' }))
    .lte('date', formatISO(end, { representation: 'date' }));

  if (error) {
    console.error('Error fetching time entries for site and week:', error);
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

export const upsertTimeEntries = async (entries: Partial<TimeEntry>[]) => {
  if (entries.length === 0) return [];
  const { data, error } = await supabase
    .from('time_entries')
    .upsert(entries, { onConflict: 'employee_id,date' })
    .select();

  if (error) {
    console.error('Error upserting time entries:', error);
    if (error.message.includes('duplicate key value violates unique constraint')) {
        throw new Error('Für einen oder mehrere Tage existiert bereits ein Eintrag (z.B. Urlaub). Bitte entfernen Sie zuerst den bestehenden Eintrag.');
    }
    throw new Error(error.message);
  }
  return data;
};

export const deleteTimeEntries = async (entryIds: string[]) => {
    if (entryIds.length === 0) return true;
    const { error } = await supabase
        .from('time_entries')
        .delete()
        .in('id', entryIds);

    if (error) {
        console.error('Error deleting time entries:', error);
        throw new Error(error.message);
    }
    return true;
}