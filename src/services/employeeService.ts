import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';

export type NewEmployee = Omit<Employee, 'id' | 'created_at' | 'time_entries'>;

export const getEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('last_name', { ascending: true });

  if (error) {
    console.error('Error fetching employees:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const getEmployeeById = async (id: string): Promise<Employee | null> => {
    const { data, error } = await supabase
    .from('employees')
    .select('*, time_entries(*, sites(id, name))')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching employee by id:', error);
    throw new Error(error.message);
  }
  // Sort time entries by date descending
  if (data && data.time_entries) {
    data.time_entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return data;
}

export const createEmployee = async (employeeData: NewEmployee) => {
  const { data, error } = await supabase
    .from('employees')
    .insert([employeeData])
    .select()
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateEmployee = async (id: string, employeeData: Partial<NewEmployee>) => {
  const { data, error } = await supabase
    .from('employees')
    .update(employeeData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating employee:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteEmployee = async (id: string) => {
  const { error } = await supabase.from('employees').delete().eq('id', id);

  if (error) {
    console.error('Error deleting employee:', error);
    throw new Error(error.message);
  }
  return true;
};