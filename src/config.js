export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const serviceCities = ['Lucknow', 'Unnao', 'Kanpur', 'Basti', 'Gorakhpur'];
