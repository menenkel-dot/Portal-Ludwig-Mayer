import { supabase } from '@/lib/supabase';
import { Material } from '@/types';

export type NewMaterial = Omit<Material, 'id' | 'created_at'>;

export const getMaterials = async (): Promise<Material[]> => {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching materials:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const createMaterial = async (materialData: NewMaterial) => {
  const { data, error } = await supabase
    .from('materials')
    .insert([materialData])
    .select()
    .single();

  if (error) {
    console.error('Error creating material:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateMaterial = async (id: string, materialData: Partial<NewMaterial>) => {
  const { data, error } = await supabase
    .from('materials')
    .update(materialData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating material:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteMaterial = async (id: string) => {
  const { error } = await supabase.from('materials').delete().eq('id', id);

  if (error) {
    console.error('Error deleting material:', error);
    throw new Error(error.message);
  }
  return true;
};