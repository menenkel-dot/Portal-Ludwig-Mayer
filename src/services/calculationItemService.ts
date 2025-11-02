import { supabase } from '@/lib/supabase';
import { CalculationItem } from '@/types';

export type NewCalculationItem = Omit<CalculationItem, 'id' | 'created_at' | 'total_price'>;

export const getCalculationItems = async (calculationId: string): Promise<CalculationItem[]> => {
  const { data, error } = await supabase
    .from('calculation_items')
    .select('*')
    .eq('calculation_id', calculationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching calculation items:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const createCalculationItem = async (itemData: NewCalculationItem) => {
  const { data, error } = await supabase
    .from('calculation_items')
    .insert([itemData])
    .select()
    .single();

  if (error) {
    console.error('Error creating calculation item:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateCalculationItem = async (id: string, itemData: Partial<NewCalculationItem>) => {
  const { data, error } = await supabase
    .from('calculation_items')
    .update(itemData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating calculation item:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteCalculationItem = async (id: string) => {
  const { error } = await supabase.from('calculation_items').delete().eq('id', id);

  if (error) {
    console.error('Error deleting calculation item:', error);
    throw new Error(error.message);
  }
  return true;
};