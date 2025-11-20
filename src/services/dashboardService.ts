import { supabase } from '@/lib/supabase';

// Gibt die Standard-Widgets basierend auf den Berechtigungen eines Benutzers zurück
const getDefaultWidgets = (permissions: string[], isAdmin: boolean): string[] => {
  const defaults = new Set<string>();
  if (isAdmin || permissions.includes('sites')) defaults.add('stat_cards');
  if (isAdmin || permissions.includes('time-tracking')) defaults.add('weekly_hours');
  if (isAdmin || permissions.includes('time-tracking')) defaults.add('recent_activities');
  if (isAdmin || permissions.includes('sites')) defaults.add('active_projects');
  return Array.from(defaults);
};

// Ruft die Dashboard-Einstellungen für einen Benutzer ab
export const getDashboardPreferences = async (userId: string, permissions: string[], isAdmin: boolean): Promise<string[]> => {
  const { data, error } = await supabase
    .from('user_dashboard_preferences')
    .select('visible_widgets')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching dashboard preferences:', error);
    throw new Error(error.message);
  }

  if (data) {
    return data.visible_widgets;
  }

  // Wenn keine Einstellungen vorhanden sind, die Standardeinstellungen zurückgeben
  return getDefaultWidgets(permissions, isAdmin);
};

// Aktualisiert die Dashboard-Einstellungen für einen Benutzer
export const updateDashboardPreferences = async (userId: string, visible_widgets: string[]) => {
  const { data, error } = await supabase
    .from('user_dashboard_preferences')
    .upsert({ user_id: userId, visible_widgets, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error('Error updating dashboard preferences:', error);
    throw new Error(error.message);
  }

  return data;
};