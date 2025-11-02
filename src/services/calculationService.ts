import { supabase } from '@/lib/supabase';
import { Calculation } from '@/types';

export type NewCalculation = Omit<Calculation, 'id' | 'created_at' | 'sites' | 'total_amount'>;

export const getCalculations = async (): Promise<Calculation[]> => {
  const { data, error } = await supabase
    .from('calculations')
    .select('*, sites(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching calculations:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const createCalculation = async (calculationData: NewCalculation) => {
  const { data, error } = await supabase
    .from('calculations')
    .insert([calculationData])
    .select()
    .single();

  if (error) {
    console.error('Error creating calculation:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateCalculation = async (id: string, calculationData: Partial<NewCalculation>) => {
  const { data, error } = await supabase
    .from('calculations')
    .update(calculationData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating calculation:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteCalculation = async (id: string) => {
  const { error } = await supabase.from('calculations').delete().eq('id', id);

  if (error) {
    console.error('Error deleting calculation:', error);
    throw new Error(error.message);
  }
  return true;
};