import { createClient } from '@supabase/supabase-js';
import { isConfigured, supabaseAnonKey, supabaseUrl } from './config.js';

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
