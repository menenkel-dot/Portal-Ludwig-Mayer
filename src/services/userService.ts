import { supabase } from '@/lib/supabase';
import { AppUser } from '@/types';

export type NewUserPayload = {
  email: string;
  password?: string;
  permissions: string[];
  department?: string;
  role?: 'admin' | 'user';
};

export type UpdateUserPayload = {
    userId: string;
    permissions: string[];
    department?: string;
    role?: 'admin' | 'user';
}

export const getUsers = async (): Promise<AppUser[]> => {
  const { data, error } = await supabase.functions.invoke('get-users');

  if (error) {
    console.error('Error fetching users:', error);
    throw new Error(error.message);
  }
  return data.users || [];
};

export const createUser = async (userData: NewUserPayload) => {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: userData,
  });

  if (error) {
    console.error('Error creating user:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateUser = async (userData: UpdateUserPayload) => {
    const { data, error } = await supabase.functions.invoke('update-user', {
        body: userData,
    });

    if (error) {
        console.error('Error updating user:', error);
        throw new Error(error.message);
    }
    return data;
}