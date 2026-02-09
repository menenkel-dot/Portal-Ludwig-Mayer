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

export const deleteTimeEntries = async (ids: string[]) => {
  const { error } = await supabase.from('time_entries').delete().in('id', ids);

  if (error) {
    console.error('Error deleting time entries:', error);
    throw new Error(error.message);
  }
  return true;
};

export const saveWeeklyTimeEntries = async (entries: { employee_id: string, site_id: string, date: string, hours_worked: number, hourly_rate: number, existing_ids: string[] }[]) => {
  const entriesToInsert: NewTimeEntry[] = [];
  const entryIdsToDelete: string[] = [];

  entries.forEach(entry => {
    entryIdsToDelete.push(...entry.existing_ids);
    if (entry.hours_worked > 0) {
      entriesToInsert.push({
        employee_id: entry.employee_id,
        site_id: entry.site_id,
        date: entry.date,
        hours_worked: entry.hours_worked,
        hourly_rate: entry.hourly_rate,
        entry_type: 'Arbeit',
        description: undefined,
      });
    }
  });

  // 1. Delete all existing entries that are being replaced or zeroed out
  if (entryIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .in('id', entryIdsToDelete);

    if (deleteError) {
      console.error('Error deleting old time entries:', deleteError);
      throw new Error(deleteError.message);
    }
  }

  // 2. Insert new entries (only those with hours > 0)
  if (entriesToInsert.length > 0) {
    const { data, error: insertError } = await supabase
      .from('time_entries')
      .insert(entriesToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting new time entries:', insertError);
      throw new Error(insertError.message);
    }
    return data;
  }
  
  return [];
};