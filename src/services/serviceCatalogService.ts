import { supabase } from '@/lib/supabase';
import { ServiceItem, ServiceItemComponent } from '@/types';

// --- Service Items ---
export type NewServiceItem = Omit<ServiceItem, 'id' | 'created_at' | 'service_item_components'>;

export const getServiceItems = async (): Promise<ServiceItem[]> => {
  const { data, error } = await supabase
    .from('service_items')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching service items:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const getServiceItemById = async (id: string): Promise<ServiceItem | null> => {
  const { data, error } = await supabase
    .from('service_items')
    .select('*, service_item_components(*, materials(name))')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching service item by id:', error);
    throw new Error(error.message);
  }
  if (data && data.service_item_components) {
    data.service_item_components.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return data;
};

export const createServiceItem = async (itemData: NewServiceItem) => {
  const { data, error } = await supabase
    .from('service_items')
    .insert([itemData])
    .select()
    .single();

  if (error) {
    console.error('Error creating service item:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateServiceItem = async (id: string, itemData: Partial<NewServiceItem>) => {
  const { data, error } = await supabase
    .from('service_items')
    .update(itemData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating service item:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteServiceItem = async (id: string) => {
  const { error } = await supabase.from('service_items').delete().eq('id', id);

  if (error) {
    console.error('Error deleting service item:', error);
    throw new Error(error.message);
  }
  return true;
};

// --- Service Item Components ---
export type NewServiceItemComponent = Omit<ServiceItemComponent, 'id' | 'created_at' | 'materials'>;

export const createServiceItemComponent = async (componentData: NewServiceItemComponent) => {
  const { data, error } = await supabase
    .from('service_item_components')
    .insert([componentData])
    .select()
    .single();

  if (error) {
    console.error('Error creating service item component:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateServiceItemComponent = async (id: string, componentData: Partial<NewServiceItemComponent>) => {
  const { data, error } = await supabase
    .from('service_item_components')
    .update(componentData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating service item component:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteServiceItemComponent = async (id: string) => {
  const { error } = await supabase.from('service_item_components').delete().eq('id', id);

  if (error) {
    console.error('Error deleting service item component:', error);
    throw new Error(error.message);
  }
  return true;
};