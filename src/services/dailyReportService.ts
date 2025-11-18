import { supabase } from '@/lib/supabase';
import { DailyConstructionReport } from '@/types';
import { format } from 'date-fns';

export type UpsertReportPayload = Omit<DailyConstructionReport, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id'> & { created_by_user_id: string };

export const getReportForDate = async (siteId: string, date: Date): Promise<DailyConstructionReport | null> => {
  const dateString = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('daily_construction_reports')
    .select('*')
    .eq('site_id', siteId)
    .eq('report_date', dateString)
    .maybeSingle();

  if (error) {
    console.error('Error fetching daily report:', error);
    throw new Error(error.message);
  }
  return data;
};

export const upsertDailyReport = async (reportData: UpsertReportPayload) => {
  const { data, error } = await supabase
    .from('daily_construction_reports')
    .upsert(reportData, { onConflict: 'site_id,report_date' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting daily report:', error);
    throw new Error(error.message);
  }
  return data;
};