import { supabase } from '@/lib/supabase';
import { RegieReport } from '@/types';

export type UpdateRegieReportPayload = Partial<Omit<RegieReport, 'id' | 'created_at' | 'updated_at' | 'site_id'>>;

export const getRegieReportsForSite = async (siteId: string): Promise<RegieReport[]> => {
  const { data, error } = await supabase
    .from('regie_reports')
    .select('*')
    .eq('site_id', siteId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false });

  if (error) {
    console.error('Error fetching regie reports:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const getOrCreateRegieReportForWeek = async (siteId: string, weekNumber: number, year: number): Promise<RegieReport> => {
  const { data: existing, error: fetchError } = await supabase
    .from('regie_reports')
    .select('*')
    .eq('site_id', siteId)
    .eq('week_number', weekNumber)
    .eq('year', year)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching regie report:', fetchError);
    throw new Error(fetchError.message);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from('regie_reports')
    .insert({
      site_id: siteId,
      week_number: weekNumber,
      year: year,
      status: 'Entwurf',
      employee_hours: [],
      work_descriptions: [],
      materials: [],
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating regie report:', createError);
    throw new Error(createError.message);
  }

  return created;
};

export const updateRegieReport = async (id: string, payload: UpdateRegieReportPayload): Promise<RegieReport> => {
  const { data, error } = await supabase
    .from('regie_reports')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating regie report:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteRegieReport = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('regie_reports').delete().eq('id', id);

  if (error) {
    console.error('Error deleting regie report:', error);
    throw new Error(error.message);
  }
  return true;
};