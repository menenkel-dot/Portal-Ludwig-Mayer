import { supabase } from '@/lib/supabase';
import { Vehicle } from '@/types';

export type NewVehicle = Omit<Vehicle, 'id' | 'created_at'>;

export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('manufacturer', { ascending: true });

  if (error) {
    console.error('Error fetching vehicles:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const createVehicle = async (vehicleData: NewVehicle) => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert([vehicleData])
    .select()
    .single();

  if (error) {
    console.error('Error creating vehicle:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateVehicle = async (id: string, vehicleData: Partial<NewVehicle>) => {
  const { data, error } = await supabase
    .from('vehicles')
    .update(vehicleData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating vehicle:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteVehicle = async (id: string) => {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);

  if (error) {
    console.error('Error deleting vehicle:', error);
    throw new Error(error.message);
  }
  return true;
};