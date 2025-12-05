import { createClient } from '@supabase/supabase-js';

// Project Credentials
export const PROJECT_URL = 'https://vgubtzdnimaguwaqzlpa.supabase.co';
export const PUBLISHABLE_KEY = 'sb_publishable_ijLCCF5_Q_5GUy3_ytKjZw_CMlM_nE3';

// Initialize Supabase Client
export const supabase = createClient(PROJECT_URL, PUBLISHABLE_KEY);