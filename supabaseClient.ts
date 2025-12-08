
import { createClient } from '@supabase/supabase-js';

// Project Credentials
// Check for environment variables first, fallback to hardcoded values
const envUrl = typeof process !== 'undefined' && process.env ? process.env.REACT_APP_SUPABASE_URL : undefined;
const envKey = typeof process !== 'undefined' && process.env ? process.env.REACT_APP_SUPABASE_ANON_KEY : undefined;

export const PROJECT_URL = envUrl || 'https://vgubtzdnimaguwaqzlpa.supabase.co';
export const PUBLISHABLE_KEY = envKey || 'sb_publishable_ijLCCF5_Q_5GUy3_ytKjZw_CMlM_nE3';

// Initialize Supabase Client
export const supabase = createClient(PROJECT_URL, PUBLISHABLE_KEY);
