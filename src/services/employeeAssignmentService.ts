import { supabase } from '@/lib/supabase';
import { EmployeeAssignment } from '@/types';
import { formatISO } from 'date-fns';

export const getAssignmentsForWeek = async (weekStartDate: Date): Promise<EmployeeAssignment[]> => {
  const { data, error } = await supabase
    .from('employee_assignments')
    .select('*, employees(id, first_name, last_name), sites(id, name)')
    .eq('week_start_date', formatISO(weekStartDate, { representation: 'date' }));

  if (error) {
    console.error('Error fetching assignments:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export type UpsertPayload = Omit<EmployeeAssignment, 'id' | 'created_at' | 'employees' | 'sites'>;

export const upsertAssignments = async (assignments: UpsertPayload[]) => {
  if (assignments.length === 0) return [];
  const { data, error } = await supabase
    .from('employee_assignments')
    .upsert(assignments, { onConflict: 'employee_id,week_start_date', ignoreDuplicates: false })
    .select();

  if (error) {
    console.error('Error upserting assignments:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteAssignments = async (assignmentIds: string[]) => {
  if (assignmentIds.length === 0) return true;
  const { error } = await supabase
    .from('employee_assignments')
    .delete()
    .in('id', assignmentIds);

  if (error) {
    console.error('Error deleting assignments:', error);
    throw new Error(error.message);
  }
  return true;
};