import { createClient } from '@supabase/supabase-js';
import { HAS_SUPABASE_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/runtime';

export const hasSupabaseConfig = HAS_SUPABASE_CONFIG;

export const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
